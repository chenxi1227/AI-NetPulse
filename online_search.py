from ddgs import DDGS
from localAI_Reviw_Web import my
from dotenv import load_dotenv
import json

load_dotenv()

def search(target):
    query_str = f"{target} website definition overview"
    raw_results = []
    
    with DDGS(timeout=10) as ddgs:
        try:
            raw_results = list(ddgs.text(query_str, max_results=5))
        except Exception as e:
            print(f"ERROR: {e}")
            raw_results = []

    search_results_str = ""
    if raw_results:
        for idx, res in enumerate(raw_results, 1):
            title = res.get('title', 'No Title')
            snippet = res.get('body', 'No Snippet')
            search_results_str += f"[{idx}] Title: {title}\nSnippet: {snippet}\n\n"
    else:
        search_results_str = "No internet search results available."

    context = (
        f"Task: Please review the following search results about the website '{target}'.\n"
        f"Determine if this website is related to AI chatbots.\n"
        f"If it is related to AI chatbots, reply ONLY 'True'. If not, reply 'False'.\n\n"
        f"Search Results:\n{search_results_str}"
    )

    final_result = my(target, context)

    #print(f"website: {target} is relate AI: {final_result}")

#search(target="copilot.microsoft.com")