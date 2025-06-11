export const CL_OWNER = "you@gmail.com";   // Your Gerrit email address.

export const GERRIT_SERVER_URL = "https://fuchsia-review.googlesource.com"; // Your Gerrit server URL (e.g., https://gerrit.example.com)
export const OUTPUT_FILENAME = "fuchsia_commit_messages.md";         // The name of the Markdown output file

export const DAYS_TO_LOOK_BACK = 180;                               // Number of days to look back (approx. 6 months)
export const API_FETCH_LIMIT = 500;                                 // Max changes to fetch per Gerrit API request (Gerrit's default is 25, 500 is often max)
