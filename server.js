const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("الخادم يعمل بنجاح! 🎉");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});