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
    name: "activity",
    description: "Create youtube activity in your channel",
    options: [
      {
        name: "type",
        description: "Select type of activity",
        type: 3,
        required: true,
        choices: [
          {
            name: "Watch Together",
            value: "880218394199220334"
          },
          {
            name: "Poker Night (required server boost level 1)",
            value: "755827207812677713"
          },
          {
            name: "Betrayal.io",
            value: "773336526917861400"
          },
          {
            name: "Fishington.io",
            value: "814288819477020702"
          },
          {
            name: "Chess In The Park (required server boost level 1)",
            value: "832012774040141894"
          },
          {
            name: "Sketchy Artist",
            value: "879864070101172255"
          },
          {
            name: "Awkword",
            value: "879863881349087252"
          },
          {
            name: "Doodle Crew",
            value: "878067389634314250"
          },
          {
            name: "Sketch Heads",
            value: "902271654783242291"
          },
          {
            name: "Letter League(Formerly known as 'Letter Tile')",
            value: "879863686565621790"
          },
          {
            name: "Word Snacks",
            value: "879863976006127627"
          },
          {
            name: "SpellCast (required server boost level 1)",
            value: "852509694341283871"
          },
          {
            name: "Putt Party",
            value: "945737671223947305"
          }
        ]
      },
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