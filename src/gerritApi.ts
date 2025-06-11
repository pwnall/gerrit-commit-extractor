// This file handles all interactions with the Gerrit REST API.
import fetch from 'node-fetch';
import { GERRIT_SERVER_URL, API_FETCH_LIMIT } from './config';

// Interface defining the structure of a Gerrit commit object
interface CommitInfo {
    commit: string;     // SHA-1 of the commit
    subject: string;    // Subject line of the commit message
    message: string;    // Full commit message body
}

// Interface defining the structure of a Gerrit revision object
interface RevisionInfo {
    commit?: CommitInfo; // Contains the commit details, optional if 'o=COMMIT_MESSAGES' is not used
    // Other fields in RevisionInfo are omitted for brevity as they are not needed for this task.
}

// Interface defining the structure of a Gerrit change (CL) object
interface ChangeInfo {
    id: string;             // The ID of the change (e.g., "project~branch~Ichangeid")
    project: string;        // The project name
    branch: string;         // The branch name
    change_id: string;      // The Change-Id (e.g., "Iabcdef1234567890abcdef1234567890abcdef1")
    subject: string;        // The subject line of the change (usually the first line of the commit message)
    status: string;         // The current status of the change (e.g., "MERGED", "NEW", "ABANDONED")
    submitted: string;      // The timestamp when the change was submitted (ISO 8601 string)
    revisions?: {           // A map of revisions, keyed by SHA-1 hash
        [sha: string]: RevisionInfo;
    };
    current_revision?: string; // The SHA-1 of the current revision
    // Other fields in ChangeInfo are omitted for brevity as they are not needed for this task.
}

/**
 * Fetches all merged Gerrit changes (CLs) submitted after a specified date.
 * It handles pagination to retrieve all results.
 * @param owner The user whose changes are retrieved.
 * @param afterDate The date string in 'YYYY-MM-DD' format to filter changes submitted after this date.
 * @param gerritUsername The Gerrit username for authentication.
 * @param gerritHttpPassword The Gerrit HTTP password for authentication.
 * @returns A Promise that resolves to an array of ChangeInfo objects.
 */
export async function fetchMergedChanges(
    owner: string,
    afterDate: string,
    gerritUsername: string,
    gerritHttpPassword: string
): Promise<ChangeInfo[]> {
    let allChanges: ChangeInfo[] = []; // Accumulator for all fetched changes
    let start = 0;                     // Starting index for pagination
    let hasMore = true;                // Flag to control pagination loop
    const authHeader = `Basic ${Buffer.from(`${gerritUsername}:${gerritHttpPassword}`).toString('base64')}`;

    console.log(`Starting fetch for merged changes submitted after: ${afterDate}`);

    while (hasMore) {
        // Gerrit API documentation:
        // https://gerrit-review.googlesource.com/Documentation/rest-api-changes.html

        // Construct the Gerrit API URL with query parameters:
        // - q=status:merged: Filters for changes with 'MERGED' status.
        // - after:${afterDate}: Filters for changes submitted after the specified date.
        // - o=CURRENT_COMMIT: Includes the full commit message in the response (most efficient).
        // - S=${start}: Specifies the starting index for pagination.
        // - n=${API_FETCH_LIMIT}: Specifies the maximum number of results to return per request.
        const url = `${GERRIT_SERVER_URL}/a/changes/?q=status:merged+after:${afterDate}+owner:${owner}&o=CURRENT_COMMIT&o=CURRENT_REVISION&S=${start}&n=${API_FETCH_LIMIT}`;
        console.log(`Fetching page (start: ${start}, limit: ${API_FETCH_LIMIT}): ${url}`);

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader, // Set the Authorization header for basic authentication
                    'Content-Type': 'application/json' // Indicate that we expect JSON
                }
            });

            // Check if the HTTP response was successful
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gerrit API error: ${response.status} - ${response.statusText}\nResponse body: ${errorText}`);
            }

            // Gerrit API often includes a ")]}'\n" prefix for XSS protection.
            // We need to strip this prefix before parsing the JSON.
            const rawText = await response.text();
            const jsonText = rawText.startsWith(")]}'\n") ? rawText.substring(4) : rawText;

            const changes: ChangeInfo[] = JSON.parse(jsonText);

            if (changes.length > 0) {
                // Add fetched changes to the accumulated list
                allChanges = allChanges.concat(changes);
                // Increment the start index for the next page
                start += changes.length;
            }

            // Determine if there are more pages to fetch:
            // If the number of changes returned is less than the limit, it means we've reached the last page.
            hasMore = changes.length === API_FETCH_LIMIT;

            if (changes.length === 0 && start === 0) {
                // No changes found at all on the first request
                console.log("No merged changes found for the given criteria.");
                hasMore = false; // Stop the loop
            } else if (!hasMore) {
                // We fetched fewer than the limit, so this was the last page
                console.log(`Fetched ${changes.length} changes. Reached end of results.`);
            } else {
                // We fetched the maximum allowed, so there might be more
                console.log(`Fetched ${changes.length} changes. Continuing to fetch more...`);
            }

        } catch (error) {
            console.error(`Error fetching changes from Gerrit API: ${error}`);
            // Re-throw the error to be caught by the main function
            throw error;
        }
    }

    console.log(`Total merged changes fetched across all pages: ${allChanges.length}`);
    return allChanges;
}
