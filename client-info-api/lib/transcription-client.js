"use strict";

const { SonioxClient } = require("./soniox-client");

function createTranscriptionClient(config, openAiClient) {
  const provider = String(
    (config.transcription && config.transcription.provider) || "openai"
  ).toLowerCase();

  if (provider === "openai") {
    return openAiClient;
  }

  if (provider === "soniox") {
    return new SonioxClient(config);
  }

  throw new Error(
    `Unsupported TRANSCRIPTION_PROVIDER "${provider}". Use "openai" or "soniox".`
  );
}

module.exports = {
  createTranscriptionClient
};
