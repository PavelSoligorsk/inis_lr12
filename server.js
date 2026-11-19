require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const Article = require("./src/models/Article");

const app = express();
app.use("/vendor", express.static(path.join(__dirname, "node_modules/plotly.js-dist-min")));

const seed = [
  ["Как дизайн-системы ускоряют масштабирование веб-приложений", "Алексей П.", "Фронтенд", 42],
  ["Зачем карточке отдельный компонент", "Марина К.", "Компоненты", 18],
  ["Общий фильтр не живёт в карточке", "Илья С.", "Состояние", 7],
  ["Обложка как файл, а не как цвет", "Ольга В.", "Фронтенд", 3],
];

app.get("/api/analytics/summary", async (req, res) => {
  try {
    const rows = await Article.aggregate([
      { $sort: { likes: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, title: 1, likes: 1 } },
    ]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Не удалось собрать статистику" });
  }
});

app.get("/stats", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Статистика</title>
<script src="/vendor/plotly.min.js"></script>
<style>body{font-family:system-ui;max-width:860px;margin:24px auto} #chart{height:460px}</style>
</head><body>
<h1>Отметки статей</h1>
<div id="chart"></div>
<script>
fetch("/api/analytics/summary").then(r => r.json()).then(rows => {
  const titles = rows.map(row => row.title).reverse();
  const likes = rows.map(row => row.likes).reverse();
  Plotly.newPlot("chart", [{
    type: "bar",
    orientation: "h",
    x: likes,
    y: titles,
    marker: { color: "#4e46dc" },
    hovertemplate: "%{y}<br>%{x} отметок<extra></extra>"
  }], {
    title: "Топ статей по числу отметок",
    xaxis: { title: "Отметки" },
    yaxis: { title: "Статья" },
    margin: { l: 460, r: 24, t: 48, b: 48 }
  }, { responsive: true });
});
</script>
</body></html>`);
});

async function connect() {
  const uri = process.env.MONGO_URI;
  if (uri) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
      return;
    } catch (error) {
      console.log("Строка из .env недоступна, поднимаю встроенный MongoDB");
    }
  }
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const memory = await MongoMemoryServer.create();
  await mongoose.connect(memory.getUri("blog"));
}

connect().then(async () => {
  if ((await Article.countDocuments()) === 0) {
    await Article.insertMany(
      seed.map(([title, author, tag, likes]) => ({
        title,
        author,
        tag,
        likes,
        content: "Текст статьи для подсчёта отметок.",
      })),
    );
  }
  app.listen(4020, () => console.log("stats http://127.0.0.1:4020/stats"));
});
