# ozhdict_find
GitHub Pages site for searching the [Ozhegov dictionary sticker packs](https://t.me/addstickers/ozhdict0000_by_ozhdbot).
The dictionary has 38 955 words spread across **325 sticker packs** (120 stickers each). This page lets you search for a word and get a direct link to the pack that contains it.
## Features
- Real-time search (case-insensitive, Ё treated as Е)
- Toggle between "match anywhere" and "match from start of word"
- Results grouped by sticker pack, showing only the matching words
- Alphabet quick-jump buttons, dynamically grayed out based on current results
## Files
| File | Description |
|------|-------------|
| `index.html` | Page structure |
| `style.css` | Styles |
| `app.js` | Search and render logic |
| `config.js` | Constants: pack names, letter→pack mapping, URL builder |
| `words.js` | Auto-generated array of all 38 955 dictionary words |
## Enabling GitHub Pages
1. Push all files to the `main` branch of this repository.
2. Go to **Settings → Pages**.
3. Under *Source*, select **Deploy from a branch**, choose `main` and `/ (root)`.
4. Save. The site will be live at `https://<your-username>.github.io/ozhdict_find/`.
No build step or GitHub Actions workflow is needed — it's a plain static site.
## Updating
If more packs become available in the future, update `config.js`:
- Increment `UPLOADED_UNTIL`.
- Add the new pack name(s) to `PACK_NAMES`.
- Regenerate `words.js` from the updated `dict.txt` using the script in the bot repository.
