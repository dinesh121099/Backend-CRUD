import https from "https";

// Utility function to fetch JSON from a remote HTTPS API
export default function fetchJSON(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      https.get(url, res => {
        let data = '';
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } 
          catch (err) {
            reject(err);
          }
        });
      }).on("error", reject);
    });
  }