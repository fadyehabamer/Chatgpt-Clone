<p align="center">
<img src="repoAsset.webp" />
</p>

# ChatGPT Clone

A ChatGPT-style chat UI built with React, Vite and
[chat-ui-kit-react](https://github.com/chatscope/chat-ui-kit-react). Messages are
sent to a small Express server that calls the OpenAI API with the official
[`openai`](https://www.npmjs.com/package/openai) SDK, so your API key is never
shipped to the browser.

## Requirements

- Node.js 22.12 or newer
- An OpenAI API key

## Setup

```sh
npm install
cp .env.example .env   # then put your key in OPENAI_API_KEY
```

| Variable         | Required | Description                                  |
| ---------------- | -------- | -------------------------------------------- |
| `OPENAI_API_KEY` | yes      | Your OpenAI API key (server-side only).      |
| `OPENAI_MODEL`   | no       | Model to use. Defaults to `gpt-5.5`.         |
| `PORT`           | no       | Port for the API server. Defaults to `3001`. |

Never commit `.env`; it is listed in `.gitignore`.

## Development

Run the API server and the Vite dev server in two terminals:

```sh
npm run server   # API on http://localhost:3001 (restarts on changes)
npm run dev      # UI on http://localhost:5173, proxies /api to the server
```

## Production

```sh
npm run build    # outputs the UI to dist/
npm start        # serves dist/ and /api/chat from the same server
```

## Tests

```sh
npm test         # validates the /api/chat request checks
```

## License

[MIT](LICENSE)
