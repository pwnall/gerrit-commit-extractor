// This is the main application logic that orchestrates fetching and outputting data.
import { format, subDays } from 'date-fns'; // For date calculations and formatting
import { fetchMergedChanges } from './gerritApi'; // Import the Gerrit API interaction function
import { getGerritCredentials } from './gitCookies'; // Import the function to retrieve Gerrit credentials from .gitcookies
import { GERRIT_SERVER_URL, OUTPUT_FILENAME, CL_OWNER, DAYS_TO_LOOK_BACK } from './config'; // Import configuration variables
import * as fs from 'fs'; // Node.js File System module for writing the output file

/**
 * Main function to execute the application logic.
 */
async function main() {
    // Get Gerrit credentials
    let gerritUsername: string;
    let gerritHttpPassword: string;
    try {
        const credentials = getGerritCredentials(GERRIT_SERVER_URL);
        gerritUsername = credentials.username;
        gerritHttpPassword = credentials.httpPassword;
        console.log(`Successfully loaded credentials for user: ${gerritUsername}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("FATAL: Could not load Gerrit credentials from .gitcookies.");
        console.error(errorMessage);
        process.exit(1);
    }

    try {
        // Calculate the date for the start of the 6-month period.
        // `subDays` subtracts the specified number of days from the current date.
        const sixMonthsAgo = subDays(new Date(), DAYS_TO_LOOK_BACK);
        // Format the date into 'YYYY-MM-DD' string, which is required by Gerrit API's 'after:' operator.
        const afterDate = format(sixMonthsAgo, 'yyyy-MM-dd');

        console.log(`Initiating process to fetch merged CLs submitted after: ${afterDate}`);

        // Fetch the merged changes from Gerrit using the calculated date.
        const mergedChanges = await fetchMergedChanges(CL_OWNER, afterDate, gerritUsername, gerritHttpPassword);

        // Initialize the Markdown content string with a header.
        let markdownContent = `# Merged Gerrit CL Commit Messages (Last ${DAYS_TO_LOOK_BACK} Days)\n\n`;
        markdownContent += `*Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}*\n\n`;
        markdownContent += `This document lists the commit messages (CL summary descriptions) from merged Gerrit Code Reviews submitted in the last ${DAYS_TO_LOOK_BACK} days.\n\n`;

        // Check if any changes were found.
        if (mergedChanges.length === 0) {
            markdownContent += "No merged changes found for the specified period.\n";
        } else {
            // Sort the changes by their submitted date in descending order (most recent first).
            mergedChanges.sort((a, b) => new Date(b.submitted).getTime() - new Date(a.submitted).getTime());

            // Iterate over each fetched change to extract and format its commit message.
            for (const change of mergedChanges) {
                // Access the commit message. Since we used `o=COMMIT_MESSAGES`,
                // the `revisions` field should contain the `commit` object.
                const currentRevisionSha = change.current_revision;
                const revision = currentRevisionSha ? change.revisions?.[currentRevisionSha] : undefined;
                const commit = revision?.commit;

                if (commit) {
                    // Format each commit message into a Markdown section.
                    // Includes: subject, project, branch, Change-Id, submitted date, Gerrit link, and the full commit message.
                    markdownContent += `---
### ${change.subject}
* **Project:** \`${change.project}\`
* **Branch:** \`${change.branch}\`
* **Change-Id:** \`${change.change_id}\`
* **Submitted:** \`${new Date(change.submitted).toLocaleString()}\`
* **Gerrit Link:** <${GERRIT_SERVER_URL}/c/${change.project}/+/${change.change_id}>
\`\`\`
${commit.message}
\`\`\`

`;
                } else {
                    // Fallback if for some reason the commit message couldn't be retrieved for a specific change.
                    console.warn(`Warning: Could not retrieve full commit message for Change-Id: ${change.change_id} (Subject: "${change.subject}")`);
                    markdownContent += `---
### ${change.subject}
* **Project:** \`${change.project}\`
* **Branch:** \`${change.branch}\`
* **Change-Id:** \`${change.change_id}\`
* **Submitted:** \`${new Date(change.submitted).toLocaleString()}\`
* **Gerrit Link:** <${GERRIT_SERVER_URL}/c/${change.project}/+/${change.change_id}>
_Commit message could not be retrieved._

`;
                }
            }
        }

        // Write the accumulated Markdown content to the specified output file.
        fs.writeFileSync(OUTPUT_FILENAME, markdownContent);
        console.log(`\nProcess completed successfully! Commit messages saved to ${OUTPUT_FILENAME}`);

    } catch (error) {
        // Catch and log any errors that occur during the process.
        console.error("\nAn unexpected error occurred:", error);
        process.exit(1); // Exit with a non-zero code to indicate an error
    }
}

// Execute the main function when the script runs.
main();
