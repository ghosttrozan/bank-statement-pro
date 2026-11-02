import urllib.request
import json
import fitz

payload = {
    "customerDetails": {
        "accountHolderName": "ARVIND S/O  NARBAT SINGH",
        "accountNumber": "902610110005760",
        "cifNumber": "138157654",
        "address": "2229/2 RAMNAGAR TEH ICHHAWAR DIST SEHORE",
        "city": "MP ICHHAWAR MADHYA PRADESH",
        "pinCode": "466115"
    },
    "branchDetails": {
        "branchName": "Ashta",
        "branchAddress": "H N 12 KEVDA WALA BAGH BHOPAL 462008",
        "branchCode": "009017",
        "ifscCode": "BKID0009017"
    },
    "accountInfo": {
        "openingBalance": 5616.96,
        "closingBalance": 37.56,
        "currency": "INR",
        "status": "Active",
        "accountType": "Savings"
    },
    "settings": {
        "bankStyle": "BOI",
        "duration": "Custom",
        "fromDate": "22-10-2022",
        "toDate": "20-04-2023",
        "profile": "Personal"
    }
}

req = urllib.request.Request(
    "http://localhost:8080/api/statements/download",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as resp:
        pdf_bytes = resp.read()
        with open("boi_generated_test.pdf", "wb") as f:
            f.write(pdf_bytes)
        print("Successfully generated BOI statement PDF! Size:", len(pdf_bytes), "bytes")
except Exception as e:
    print("Error:", e)
