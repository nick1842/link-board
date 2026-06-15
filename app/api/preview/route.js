import * as cheerio from "cheerio";

export async function POST(req) {
  const { url } = await req.json();

  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text() ||
      url;

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";

    const image =
      $('meta[property="og:image"]').attr("content") || "";

    return Response.json({ title, description, image });
  } catch {
    return Response.json({ title: url, description: "", image: "" });
  }
}