# Usage

The tool assumes that `.gitcookies` contains HTTP credentials for the Gerrit
server.

1. Install dependencies via `npm install`.
2. Modify `src/config.ts`.
3. Run via `npm run dev`.
4. Collect the Markdown file and feed it to the next step of your analysis
   pipeline.

# Authorship

This tool was generated using Gemini 2.5 Pro. I don't agree with all the
architectural choices that it made, but I got a solid tool in 30 minutes, and
I'm okay with it.

I started out with the Gemini Web app and used the following prompts.

1. I'd like to obtain the commit message (CL summary description) from all my
   merged CLs on a Gerrit server during the last 6 months. Is there a way to do
   this using the Gerrit API?

2. Please write a node.js application in TypeScript that accomplishes the task
   above, and outputs a Markdown file listing each commit message.

3. Please write a .gitignore file for the project you generated.

The generated application had two bugs I had to fix by hand. The Gemini Web app
said it encountered an issue when I asked it to fix the bugs. I did the fixes
myself, because I was curious if the app would work. The fixes took about 10
minutes.

1. Gemini hallucinated a `COMMIT_MESSAGES` option (`-o`) for the Gerrit
   `/changes` API. I had to look up the API and guess the correct options. I
   added a comment pointing to the API page docs.

2. The original code retrieved all the merged CLs, instead of filtering for my
   CLs. I had to add an `owner:` parameter to the query, and to plumb the value
   for it from the config to the Gerrit API code.

I then switched to Gemini Code Assist to get the `.gitcookies`-parsing
functionality. I used the following prompts. Gemini produced correct changes,
despite the fact that the .gitcookies line example I lifted from a Web search
was not correct.

1. This code uses hard-coded constants in config.ts. Update it to look for
   the Gerrit username and password in .gitcookies in the user's home directory.

   .gitcookies has lines that look like this: fuchsia-review.googlesource.com,TRUE,/,TRUE,2147483647,o,git-paul=1/z7s05EYPudQ9qoe6dMVfmAVwgZopEkZBb1a2mA5QtHE

   fuchsia-review... is the Gerrit URL. git-paul is the username, and 1/... is the password.

2. Please separate the .gitcookies parsing logic into a gitCookies.ts file.
   Modify main.ts to read the GERRIT_SERVER_URL config variable and pass it into
   the helper, then pass the result to the logic in gerritApi.ts.
