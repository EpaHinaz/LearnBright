# 📚 How to Add New Questions to LearnBright

Adding new assignments is simple — no coding required. Just create a JSON file and register it.

---

## 📁 Folder Structure

```
learnbright/
├── index.html                  ← The app (never edit this for questions)
├── questions/
│   ├── manifest.json           ← LIST OF ALL JSON FILES (edit this to add new ones)
│   ├── math/
│   │   ├── grade4/
│   │   │   ├── place_value.json
│   │   │   ├── fractions.json
│   │   │   └── your_new_file.json   ← add yours here
│   │   └── grade5/
│   │       └── decimals.json
│   └── ela/
│       ├── grade4/
│       └── grade5/
└── HOW_TO_ADD_QUESTIONS.md     ← This file
```

---

## ✅ Step 1 — Create a JSON File

Create a new `.json` file in the right folder.

### Format (Multiple Choice question):
```json
{
  "subject": "Math",
  "grade": "4",
  "title": "Times Tables Practice",
  "description": "Practising multiplication facts from 1–12.",
  "questions": [
    {
      "q": "What is 7 × 8?",
      "options": ["48", "54", "56", "64"],
      "answer": "56",
      "explanation": "7 × 8 = 56. You can remember it as 5, 6, 7, 8 → 56 = 7 × 8."
    }
  ]
}
```

### Format (Fill-in-the-blank question — leave options empty):
```json
{
  "q": "What is 9 × 9?",
  "options": [],
  "answer": "81",
  "explanation": "9 × 9 = 81."
}
```

### Format (Multiple accepted answers — separate with |):
```json
{
  "q": "Write one half as a decimal.",
  "options": [],
  "answer": "0.5|.5|1/2",
  "explanation": "One half = 0.5 = 1/2."
}
```

### Format (With a reading passage — for ELA comprehension):
```json
{
  "subject": "ELA",
  "grade": "4",
  "title": "Reading: Bees and Pollination",
  "description": "Non-fiction comprehension about the role of bees.",
  "passage": "Why Bees Matter\n\nBees are one of the most important insects on Earth...\n\nWithout bees, many of our favourite foods would disappear.",
  "questions": [
    {
      "q": "Why are bees described as important?",
      "options": ["They make honey", "They pollinate plants", "They are fast", "They are colourful"],
      "answer": "They pollinate plants",
      "explanation": "The passage explains bees pollinate plants, which is their most critical role."
    }
  ]
}
```

---

## ✅ Step 2 — Register the File in manifest.json

Open `questions/manifest.json` and add your file path to the `"files"` list:

```json
{
  "files": [
    "math/grade4/place_value.json",
    "math/grade4/fractions.json",
    "math/grade4/times_tables.json",      ← Add your new file here
    "ela/grade4/reading_rainforest.json"
  ]
}
```

**That's it!** Refresh the app — your new assignment appears automatically.

---

## 📋 Full JSON Field Reference

| Field | Required | Description |
|---|---|---|
| `subject` | ✅ Yes | `"Math"` or `"ELA"` (case-insensitive) |
| `grade` | ✅ Yes | `"4"` or `"5"` |
| `title` | ✅ Yes | Name shown on the assignment card |
| `description` | Optional | Short subtitle shown on the card |
| `passage` | Optional | Reading passage text (use `\n\n` for paragraph breaks) |
| `questions` | ✅ Yes | Array of question objects (see below) |

### Question Object Fields

| Field | Required | Description |
|---|---|---|
| `q` | ✅ Yes | The question text |
| `options` | ✅ Yes | Array of answer choices. **Leave empty `[]` for fill-in-the-blank** |
| `answer` | ✅ Yes | The correct answer. For MC: must exactly match one option. For fill: use `\|` to allow multiple accepted answers |
| `explanation` | Optional | Shown to the student after they answer |

---

## 💡 Tips

- **Up to 10 questions per file** is ideal (keeps sessions short and focused)
- You can have **as many files as you want** — just add each to `manifest.json`
- File names can be anything — use descriptive names like `grade4_decimals_2026.json`
- The **grade** in your JSON takes priority over the folder path
- Questions **alternate automatically** between multiple choice and fill-in based on whether `options` is empty
- To **temporarily hide** a file, just remove it from `manifest.json` (don't delete the file)

---

## 📅 Daily / Weekly Assignment Files

You can create dated files for timed practice:

```
questions/
  math/grade4/
    daily_2026_06_26.json
    daily_2026_06_27.json
    weekly_june_2026.json
```

Just add each one to `manifest.json` when ready to publish it.

---

## 🧪 Testing Your File

1. Save the JSON file
2. Add it to `manifest.json`
3. Refresh the app
4. Log in as Admin → go to ⚙️ Settings → check "JSON files loaded" count
5. Or log in as a student and look for the new card under Math or ELA

If the assignment doesn't appear:
- Check your JSON is **valid** (no missing commas, quotes, brackets)
- Use [jsonlint.com](https://jsonlint.com) to validate it
- Make sure the path in `manifest.json` exactly matches the file location

---

## ✏️ Example — Complete File

```json
{
  "subject": "Math",
  "grade": "5",
  "title": "Daily Math Test - 2026-06-27",
  "description": "Mixed practice: decimals, fractions, and geometry.",
  "questions": [
    {
      "q": "What is 6 + 7?",
      "options": ["11", "12", "13", "14"],
      "answer": "13",
      "explanation": "6 + 7 = 13. Count on from 7: 8, 9, 10, 11, 12, 13."
    },
    {
      "q": "What is 15 - 8?",
      "options": [],
      "answer": "7",
      "explanation": "15 - 8 = 7."
    },
    {
      "q": "Round 3.67 to the nearest tenth.",
      "options": [],
      "answer": "3.7",
      "explanation": "The hundredths digit is 7 (≥5), so round up: 3.7."
    },
    {
      "q": "Which shape has 4 equal sides and 4 right angles?",
      "options": ["Rectangle", "Square", "Rhombus", "Trapezoid"],
      "answer": "Square",
      "explanation": "A square has 4 equal sides AND 4 right angles (90°)."
    },
    {
      "q": "1/4 + 2/4 = ? (write with /)",
      "options": [],
      "answer": "3/4",
      "explanation": "Same denominator: 1 + 2 = 3, keep the denominator: 3/4."
    }
  ]
}
```

---

*LearnBright — free to use, modify, and share for educational purposes.*
