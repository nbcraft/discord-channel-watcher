# Discord Channel Watcher

> [!CAUTION]
> **Using this on a user account is prohibited by the [Discord TOS](https://discord.com/terms) and can lead to the account getting blocked.**  
> **I do not take any responsibility for blocked Discord accounts that used this program.**  
> **When using this program, you accept the risk of exposing your Discord Token.**

> [!WARNING]
> I therefore suggest using a throw-away discord account that will be added to the servers you want to watch.  
> Still, I do not know the extent to which your main account could be associated with the throw-away one and you accept any risk yourself.

## About

<strong>Welcome to `discord-channel-watcher`, a Discord selfbot to monitor/watch any channel and forward messages that match the configured criterion (keywords, authors, and/or roles)</strong>

If like me, you've ever been part of Discord servers that you mostly want to have muted, but would like to recieve notifications for certain keywords, certain roles, or certains user messages, then this might help you.  

This program will listen to specific channels, and forward matching messages to a channel of your choice (maybe in a Discord server you control) by using webhooks.


> [!NOTE]
> - This project uses [`discord.js-selfbot-v13@v3.6`](https://github.com/aiko-chan-ai/discord.js-selfbot-v13), which is a module that allows user accounts to interact with the Discord API v9.
>  - That project is currently in maintenance mode

## Installation

TODO

## Config.json

TODO

## Get User Token

> [!WARNING]
> This will copy your user token to the clipboard, be careful with it, and don't share it with anyone.
> It is preferable to use environment viriables to set this token in the configuration, rather than the `config.json`
> If you do set the token in `config.json` file, make sure not to share this file with anyone.

<strong>Run code (WebBrowser Console while using Discord - [Ctrl + Shift + I])</strong>  
(Paste entire block)

```js
window.webpackChunkdiscord_app.push([
  [Math.random()],
  {},
  req => {
    if (!req.c) return;
    for (const m of Object.keys(req.c)
      .map(x => req.c[x].exports)
      .filter(x => x)) {
      if (m.default && m.default.getToken !== undefined) {
        return copy(m.default.getToken());
      }
      if (m.getToken !== undefined) {
        return copy(m.getToken());
      }
    }
  },
]);
window.webpackChunkdiscord_app.pop();
console.log('%cWorked!', 'font-size: 50px');
console.log(`%cYou now have your token in the clipboard!`, 'font-size: 16px');
```

## Credits
- [`discord.js-selfbot-v13`](https://github.com/aiko-chan-ai/discord.js-selfbot-v13)