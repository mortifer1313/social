import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Comment style configurations
const stylePrompts: Record<string, string> = {
  positive: "enthusiastic, supportive, and genuinely appreciative",
  playful: "witty, fun, and slightly cheeky but friendly",
  sassy: "confident, bold, with a playful edge",
  dramatic: "expressive, passionate, and emotionally engaged",
  appreciative: "grateful, warm, and genuinely thankful",
  critics: "skeptical, questioning, focused on safety and medical/scientific validity",
  mixed: "varied - sometimes playful, sometimes supportive, sometimes curious",
};

interface CommentContext {
  platform: string;
  targetUsername?: string;
  postDescription?: string;
  category: string;
  previousComments?: string[];
}

export async function generateAIComment(context: CommentContext): Promise<string> {
  const style = stylePrompts[context.category] || stylePrompts.positive;
  
  const systemPrompt = `You are a social media user leaving authentic comments. Your style is ${style}.

Rules:
- Write ONLY the comment text, nothing else
- Keep it under 150 characters for maximum engagement
- Never use hashtags
- Never use emojis
- Sound natural and human, not like a bot or marketer
- Vary sentence structure and length
- Don't be generic - be specific and engaging
- For "critics" category: ask thoughtful questions about safety, evidence, or qualifications
- Never repeat yourself or use the same phrases`;

  const userPrompt = context.postDescription
    ? `Write a single ${context.category} comment for a ${context.platform} post about: "${context.postDescription}". Target account: @${context.targetUsername || "unknown"}.`
    : `Write a single ${context.category} comment for @${context.targetUsername || "a creator"}'s ${context.platform} post.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 100,
      temperature: 0.9,
    });

    const comment = response.choices[0]?.message?.content?.trim();
    
    if (!comment) {
      throw new Error("No comment generated");
    }

    // Clean up the comment
    return cleanComment(comment);
  } catch (error) {
    console.error("AI comment generation failed:", error);
    throw error;
  }
}

export async function generateBatchAIComments(
  context: CommentContext,
  count: number
): Promise<string[]> {
  const style = stylePrompts[context.category] || stylePrompts.positive;
  
  const systemPrompt = `You are generating authentic social media comments. Your style is ${style}.

Rules:
- Generate exactly ${count} unique comments, one per line
- Each comment should be under 150 characters
- Never use hashtags or emojis
- Sound natural and human
- Every comment must be distinctly different
- Vary sentence length and structure
- For "critics" category: ask thoughtful questions about safety, evidence, or qualifications`;

  const userPrompt = context.postDescription
    ? `Generate ${count} unique ${context.category} comments for a ${context.platform} post about: "${context.postDescription}". Output one comment per line.`
    : `Generate ${count} unique ${context.category} comments for @${context.targetUsername || "a creator"}'s ${context.platform} content. Output one comment per line.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: count * 80,
      temperature: 0.95,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error("No comments generated");
    }

    const comments = content
      .split("\n")
      .map(line => cleanComment(line))
      .filter(line => line.length > 10 && line.length < 200);

    return comments.slice(0, count);
  } catch (error) {
    console.error("Batch AI comment generation failed:", error);
    throw error;
  }
}

function cleanComment(text: string): string {
  let cleaned = text
    .replace(/^[\d]+[\.\)]\s*/g, "") // Remove numbering like "1." or "1)"
    .replace(/^["'`]|["'`]$/g, "") // Remove quotes
    .replace(/#\w+/g, ""); // Remove hashtags
  
  // Remove common emoji unicode ranges (without u flag for compatibility)
  cleaned = cleaned.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, "");
  
  return cleaned.trim();
}

export async function testAIConnection(): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say 'connected'" }],
      max_tokens: 10,
    });
    return !!response.choices[0]?.message?.content;
  } catch (error) {
    console.error("AI connection test failed:", error);
    return false;
  }
}
