window.onload = function() {
    // Function to get query parameter value
    function getQueryParam(param) {
        let urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Function to get value from localStorage or query param
    function getParamValue(param) {
        let value = getQueryParam(param);
        if (value) {
            localStorage.setItem(param, value);
        } else {
            value = localStorage.getItem(param);
        }
        if (!value) {
            console.error(`ERROR: ${param} is not provided and not found in localStorage`);
        }
        return value;
    }

    // Get values from query params or localStorage
    let apiKey = getParamValue('apikey');
    let rssUrl = getParamValue('rssUrl');
    let maxItems = getParamValue('maxItems') || 15;
    let language = getParamValue('language') || "english";

    // If any of the required parameters are missing, stop execution
    if (!apiKey || !rssUrl || !maxItems || !language) {
        if (!apiKey) console.error("ERROR: Missing: apiKey");
        if (!rssUrl) console.error("ERROR: Missing: rssUrl");
        if (!maxItems) console.error("ERROR: Missing: maxItems");
        if (!language) console.error("ERROR: Missing: language");
        return;
    }

    // Set up the main container
    const mainDiv = document.getElementById('main');

    // OpenAI API URL
    const apiUrl = "https://api.openai.com/v1/chat/completions";

    // Fetch the RSS feed
    fetch(rssUrl)
        .then(response => {
            if (!response.ok) throw new Error("ERROR: Failed to fetch RSS feed");
            return response.text();
        })
        .then(str => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(str, "text/xml");
            const items = Array.from(xmlDoc.getElementsByTagName("item")).slice(0, maxItems);

            // Create an array of promises for each item to maintain order
            const itemPromises = items.map((item, index) => {
                const title = item.getElementsByTagName("title")[0].textContent;
                let comment = item.getElementsByTagName("description")[0].textContent;
                const link = item.getElementsByTagName("link")[0].textContent;
                const commentsLink = item.getElementsByTagName("comments")[0].textContent;

                // Strip HTML tags from the comment
                const tmp = document.createElement("div");
                tmp.innerHTML = comment;
                comment = tmp.textContent || tmp.innerText || "";

                // Create the prompt for the API
                const prompt = `In 1-3 sentences, explain why this might be interesting, define any tech jargon in 1-2 sentences, and bold with HTML <b> any keywords. Respond in this language: ${language}. INPUT: ${title}`;

                console.log("Prompt: " + prompt);

                // API request data
                const data = {
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "user", content: prompt }
                    ]
                };

                // Return a promise that resolves when the API request completes
                return fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(data)
                })
                .then(response => {
                    if (!response.ok) throw new Error("ERROR: API request to OpenAI failed");
                    return response.json();
                })
                .then(apiData => {
                    let summary = apiData.choices[0].message.content;
                    summary = summary.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

                    return {
                        index,
                        listItemHtml: `
                            <li>
                                <p id="title"><b>${title}</b></p>
                                <!-- <p id="comment"><b>Original Comment:</b> ${comment}</p> -->
                                <p id="summary"><b>Summary:</b> ${summary} <a href='${link}' target='_blank'>[Link]</a>&nbsp;<a href='${commentsLink}' target='_blank'>[Comments]</a></p>
                            </li>
                        `
                    };
                })
                .catch(error => {
                    console.error("ERROR: Fetching summary:", error);
                });
            });

            // Wait for all item promises to resolve and append in order
            Promise.all(itemPromises)
                .then(results => {
                    results
                        .filter(result => result !== undefined) // Filter out failed requests
                        .sort((a, b) => a.index - b.index) // Sort by original order
                        .forEach(result => {
                            mainDiv.innerHTML += result.listItemHtml;
                        });
                })
                .catch(error => {
                    console.error("ERROR: Processing items:", error);
                });
        })
        .catch(error => {
            console.error("ERROR: Fetching RSS feed:", error);
        });
};
