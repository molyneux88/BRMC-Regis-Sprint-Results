const API_URL = "https://script.google.com/macros/s/AKfycbxa5GitlumgE44NiBazqNRGdHBfZwRSjmdOurxN1rO1qOBiLlJrwbbCZpWRQayY_B_LQw/exec";

fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    console.log("FULL DATA:", data);

    if (data.length > 0) {
      console.log("FIRST ROW:", data[0]);
      console.log("KEYS:", Object.keys(data[0]));
    }
  })
  .catch(err => console.error(err));