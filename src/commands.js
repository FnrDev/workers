module.exports = [
  {
    name: "invite",
    description: "Get bot invite link"
  },
  {
    name: "hello",
    description: "Get hello world using HTTPS Request"
  },
  {
    name: "joke",
    description: "Get random joke."
  },
  {
    name: "youtube",
    description: "Create youtube activity in your channel",
    options: [
      {
        name: "channel",
        description: "The channel to create activity for.",
        type: 7,
        channel_types: [2],
        required: true
      }
    ]
  }
];