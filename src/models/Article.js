const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String },
    tag: { type: String, required: true },
    likes: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Article", articleSchema);
