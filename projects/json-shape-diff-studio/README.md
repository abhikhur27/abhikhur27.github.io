# JSON Shape Diff Studio

Compare two versions of a JSON document to see which fields were added, removed, or changed. It runs in the browser and includes examples of an API response and a config file.

## What it does

- Compares two JSON documents entirely in the browser.
- Lists fields and array items by path, including the objects and arrays that contain them.
- Flags:
  - added paths
  - removed paths
  - type changes
  - same-type value changes
- Filters the diff table by change type.
- Copies the change counts for a pull request or a message.

## When to use it

Paste an old version on the left and a new one on the right. This makes it easier to check:

- whether an API field disappeared or changed type
- which config values changed
- whether an array gained or lost items

## Limits

Arrays are compared by position, so moving an item can look like several value changes. The tool compares the displayed previews, and strings longer than 42 characters are shortened. Two long strings with the same preview can therefore appear unchanged. Use a full text diff when you need to verify every character.

## Local run

```bash
python -m http.server 8000
```

Open `http://localhost:8000/projects/json-shape-diff-studio/`.

## GitHub Pages compatibility

- Static HTML/CSS/JS only
- No build pipeline
- No server dependency
