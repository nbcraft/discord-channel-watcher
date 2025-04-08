import { Client } from 'discord.js-selfbot-v13';
import fetch from 'node-fetch';
import config from './config.json' with { type: 'json' };

const WATCHER_USER_TOKEN = process.env.WATCHER_USER_TOKEN || config.watcherUserToken;
const DEFAULT_WEBHOOK = process.env.DEFAULT_WEBHOOK || config.defaultWebhook;

const CONFIG_MAP = config.channels.reduce((memo, conf) => {
  const { _comment, watchChannelIds, useRolesAsKeywords, ...remainingConf } = conf;
  remainingConf.roles ||= {};
  remainingConf.keywords ||= [];
  remainingConf.authors ||= [];
  if (useRolesAsKeywords) {
    remainingConf.keywords = remainingConf.keywords.concat(Object.values(remainingConf.roles));
  }
  const matchRegex = Object.keys(remainingConf.roles).concat(remainingConf.keywords).join( '|' ) ||
                     '$-'; // Impossible regex that won't ever match; for when no role and keyword
  remainingConf.matchRegex = new RegExp(matchRegex, 'i');
  // Wrapping watchChannelIds in case a single id was given; assigning conf to each id
  [].concat(watchChannelIds).forEach((watchChannelId) => memo[watchChannelId] = remainingConf);
  return memo;
}, {});

const WATCHED_CHANNEL_IDS = Object.keys(CONFIG_MAP);

const ROLE_REGEX = new RegExp('<@&\\d+>', 'i'); // Used to check for the presence of a Role

const client = new Client();

client.on('ready', async () => {
  log(`${client.user.username} is watching channels [${WATCHED_CHANNEL_IDS}]`)
});

client.on('messageCreate', async (message) => {
  if (messageMatches(message)) {
    return sendWebhook(message);
  }
});

client.login(WATCHER_USER_TOKEN);

function log(msg) {
  const date = new Date().toLocaleString('sv', { timeZoneName: 'short' }); // cheat for ISO string in timezone
  console.log(`${date}: ${msg}`) 
}

function messageMatches({ channelId, author, content, embeds }) {
  if (WATCHED_CHANNEL_IDS.includes(channelId)) {
    console.log(`\nchannelId: ${channelId}`);
    console.log(`author: ${CONFIG_MAP[channelId].authors.includes(author.id)}`);
    console.log(`content: ${CONFIG_MAP[channelId].matchRegex.test(content)}`);
    embeds.forEach((embed) => {
      [embed.title, embed.description, embed.author?.name, embed.footer?.text]
        .concat(embed.fields.flatMap(field => [field.value, field.name]))
        .filter(n => n) // compact - remove nil
        .forEach((text) => console.log(`(embed text) ${text} : ${CONFIG_MAP[channelId].matchRegex.test(text)}`));
    });
    const res = WATCHED_CHANNEL_IDS.includes(channelId) && (
      CONFIG_MAP[channelId].authors.includes(author.id) ||
      CONFIG_MAP[channelId].matchRegex.test(content) ||
      embeds.some((embed) => {
        return [embed.title, embed.description, embed.author?.name, embed.footer?.text]
          .concat(embed.fields.flatMap(field => [field.value, field.name]))
          .filter(n => n) // compact - remove nil
          .some((text) => CONFIG_MAP[channelId].matchRegex.test(text));
      })
    );
    console.log(`res: ${res}`);
    return res;
  }
  return false;
}

async function sendWebhook(message) {
  const params = buildMessageParams(message);
  fetch(CONFIG_MAP[message.channelId]?.webhookUrl || DEFAULT_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(params)
  }).then(response => {
    if (response.ok) {
      // response.status >= 200 && response.status < 300
      log(`Sent: ${JSON.stringify(params)}`);
    } else {
      log(`Failure: ${response.status}`);
      console.dir(response, { depth: 4 });
      console.dir(message, { depth: 4 });
      console.dir(params, { depth: 4 });
    }
    return response;
  });
}

function buildMessageParams(message) {
  const msgLink = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;
  const headerLine = `<@${message.author?.id}> in ${msgLink} \n`;
  const images = []; // prepare images as embeds
  message.attachments.values().forEach((attachment) => {
    images.push({ image: { url: attachment.url } });
  });
  return {
    content: `${headerLine}${replaceRoles(message.content, message.channelId)}`,
    embeds: message.embeds.map((embed) => {
      if (typeof embed.title === 'string')
        embed.title = replaceRoles(embed.title, message.channelId);
      if (typeof embed.description === 'string')
        embed.description = replaceRoles(embed.description, message.channelId);
      if (typeof embed.author?.name === 'string')
        embed.author.name = replaceRoles(embed.author.name, message.channelId, false);
      if (typeof embed.footer?.text === 'string')
        embed.footer.text = replaceRoles(embed.footer.text, message.channelId, false);
      embed.fields.forEach(field => {
        if (typeof field.name === 'string')
          field.name = replaceRoles(field.name, message.channelId);
        if (typeof field.value === 'string')
          field.value = replaceRoles(field.value, message.channelId);
      });
      return embed;
    }).concat(images),
  };
}

function replaceRoles(string, channelId, bold = true) {
  if (!ROLE_REGEX.test(string)) {
    return string; // exit early if string doesn't contain a role reference
  }
  let res = string;
  for (const [key, value] of Object.entries(CONFIG_MAP[channelId]?.roles || [])) {
    res = res.replaceAll(`<@&${key}>`, `${bold ? '**' : ''}@${value}${bold ? '**' : ''}`);
  }
  return res;
};
