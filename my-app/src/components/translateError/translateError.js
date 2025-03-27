import translate from "translate";

translate.engine = "google";
translate.from = "en";
translate.to = "ar";

export async function translateError(errorMessage) {
  try {
    const translatedText = await translate(errorMessage);
    return translatedText;
  } catch (error) {
    console.error("Translation error:", error);
    return errorMessage;
  }
}
