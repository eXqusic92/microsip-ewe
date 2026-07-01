"use strict";

const { SonioxClient } = require("./soniox-client");

function createTranscriptionClient(config) {
  return new SonioxClient(config);
}

module.exports = {
  createTranscriptionClient
};
