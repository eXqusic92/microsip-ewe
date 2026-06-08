"use strict";

const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

class LocalNotesStore {
  constructor(filename, noteAuthor) {
    this.filename = filename;
    this.noteAuthor = noteAuthor;
    this.loaded = false;
    this.data = {
      version: 1,
      notes: {}
    };
    this.writeQueue = Promise.resolve();
  }

  async load() {
    if (this.loaded) {
      return;
    }

    await fs.mkdir(path.dirname(this.filename), { recursive: true });

    try {
      const content = await fs.readFile(this.filename, "utf8");
      const parsed = JSON.parse(content);

      if (!parsed || parsed.version !== 1 || typeof parsed.notes !== "object") {
        throw new Error("unsupported local notes format");
      }

      this.data = parsed;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      await this.persist();
    }

    this.loaded = true;
  }

  async list(phone) {
    await this.load();
    return [...(this.data.notes[phone] || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  async add(phone, noteText) {
    await this.load();

    const note = {
      id: crypto.randomUUID(),
      text: noteText,
      createdBy: this.noteAuthor,
      createdAt: new Date().toISOString(),
      source: "local_json"
    };

    const notes = this.data.notes[phone] || [];
    this.data.notes[phone] = [note, ...notes];
    await this.persist();
    return note;
  }

  async persist() {
    const content = `${JSON.stringify(this.data, null, 2)}\n`;

    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(path.dirname(this.filename), { recursive: true });
      const temporaryFile = `${this.filename}.${process.pid}.tmp`;
      await fs.writeFile(temporaryFile, content, "utf8");
      await fs.rename(temporaryFile, this.filename);
    });

    return this.writeQueue;
  }
}

module.exports = {
  LocalNotesStore
};
