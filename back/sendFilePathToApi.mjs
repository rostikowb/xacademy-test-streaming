import options from "./options.mjs";

export default (id, fileName) => {
  const body = {
    password: 'seyFE8JULDrCmPVU',
    lesson_id: id,
    video_url: `/${fileName}`
  }

  fetch(options.api, {
    method: 'post',
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
  })
    .then(res => res.json())
    .then(json => console.log(json));
}