import requests

def geocode_address(address_text: str):
    """
    Converts an address string to latitude and longitude using Nominatim (OpenStreetMap).
    Returns a dict with lat, lon, and display_name.
    """
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": address_text,
            "format": "json",
            "limit": 1
        }
        headers = {
            "User-Agent": "SevaSetu-Bot/1.0"
        }
        response = requests.get(url, params=params, headers=headers)
        data = response.json()
        
        if data:
            return {
                "lat": float(data[0]["lat"]),
                "lon": float(data[0]["lon"]),
                "display_name": data[0]["display_name"]
            }
    except Exception as e:
        print(f"Geocoding error: {e}")
    
    return None
