"""
Data Validation Spike - Improved Dataset Discovery
"""

from sodapy import Socrata


def find_relevant_datasets(domain: str, keywords: list):
    client = Socrata(domain, None)
    try:
        datasets = client.datasets(limit=100)
    except Exception as e:
        print(f"Error: {e}")
        return []

    relevant = []
    for ds in datasets:
        name = ds.get("resource", {}).get("name", "").lower()
        desc = ds.get("resource", {}).get("description", "").lower()
        text = name + " " + desc

        if any(kw.lower() in text for kw in keywords):
            relevant.append({
                "id": ds.get("resource", {}).get("id"),
                "name": ds.get("resource", {}).get("name"),
                "description": desc[:120]
            })

    return relevant


def run_discovery(domain: str):
    print(f"=== Discovering Relevant Datasets on {domain} ===\n")

    keywords = ["building", "permit", "construction", "development"]
    datasets = find_relevant_datasets(domain, keywords)

    if not datasets:
        print("No relevant datasets found.")
        return

    print(f"Found {len(datasets)} potentially relevant datasets:\n")
    for i, ds in enumerate(datasets[:10], 1):
        print(f"{i}. {ds['name']}")
        print(f"   ID: {ds['id']}")
        print(f"   {ds['description']}\n")


if __name__ == "__main__":
    run_discovery("data.austintexas.gov")