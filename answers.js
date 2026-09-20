// The 20 classic Magic 8-Ball replies. `criteria` is the description Jev
// scores the question against; `mood` drives the color of the reveal.
export const ANSWERS = {
  it_is_certain: {
    text: "It is certain.",
    mood: "yes",
    criteria: "The outcome is essentially guaranteed; the asker already knows the answer is yes.",
  },
  decidedly_so: {
    text: "It is decidedly so.",
    mood: "yes",
    criteria: "A confident, emphatic yes to a clear-cut question.",
  },
  without_a_doubt: {
    text: "Without a doubt.",
    mood: "yes",
    criteria: "Yes, with no room for hesitation; the question is almost rhetorical.",
  },
  yes_definitely: {
    text: "Yes, definitely.",
    mood: "yes",
    criteria: "A warm, enthusiastic yes to a hopeful question.",
  },
  rely_on_it: {
    text: "You may rely on it.",
    mood: "yes",
    criteria: "Yes; the asker wants reassurance about something dependable or trustworthy.",
  },
  as_i_see_it_yes: {
    text: "As I see it, yes.",
    mood: "yes",
    criteria: "A measured yes that admits some personal judgment or opinion.",
  },
  most_likely: {
    text: "Most likely.",
    mood: "yes",
    criteria: "Probably yes, but the outcome is not guaranteed.",
  },
  outlook_good: {
    text: "Outlook good.",
    mood: "yes",
    criteria: "A positive forecast about a future event or plan.",
  },
  yes: {
    text: "Yes.",
    mood: "yes",
    criteria: "A plain, simple yes to a straightforward question.",
  },
  signs_point_to_yes: {
    text: "Signs point to yes.",
    mood: "yes",
    criteria: "Leaning yes based on hints or circumstantial evidence.",
  },
  reply_hazy: {
    text: "Reply hazy, try again.",
    mood: "maybe",
    criteria: "The question is vague, confusing, or missing details needed to answer.",
  },
  ask_again_later: {
    text: "Ask again later.",
    mood: "maybe",
    criteria: "The answer depends on things that have not happened yet; too early to say.",
  },
  better_not_tell: {
    text: "Better not tell you now.",
    mood: "maybe",
    criteria: "The answer might upset the asker or spoil a surprise; the question is delicate.",
  },
  cannot_predict: {
    text: "Cannot predict now.",
    mood: "maybe",
    criteria: "Genuinely unpredictable; the outcome hinges on chance or unknowns.",
  },
  concentrate: {
    text: "Concentrate and ask again.",
    mood: "maybe",
    criteria: "The question is unfocused, rambling, silly, or not really a yes/no question.",
  },
  dont_count_on_it: {
    text: "Don't count on it.",
    mood: "no",
    criteria: "Probably not; the asker is hoping for something unlikely.",
  },
  my_reply_is_no: {
    text: "My reply is no.",
    mood: "no",
    criteria: "A firm, direct no.",
  },
  sources_say_no: {
    text: "My sources say no.",
    mood: "no",
    criteria: "No, based on evidence, facts, or common knowledge.",
  },
  outlook_not_good: {
    text: "Outlook not so good.",
    mood: "no",
    criteria: "A negative forecast about a future event or plan.",
  },
  very_doubtful: {
    text: "Very doubtful.",
    mood: "no",
    criteria: "Almost certainly not; the premise is far-fetched or implausible.",
  },
};
