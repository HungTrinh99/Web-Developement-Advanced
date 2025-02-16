require("dotenv").config();
const request = require("request");
const axios = require("axios");

// import request from "request";

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Creates the endpoint for our webhook
const postWebhook = (req, res) => {
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === "page") {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function (entry) {
      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log("Sender PSID: " + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
};

// Adds support for GET requests to our webhook
const getWebhook = (req, res) => {
  // Your verify token. Should be a random string.

  // Parse the query params
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
};

// Handles messages events
async function handleMessage(sender_psid, received_message) {
  let response = null;

  if (received_message.text) {
    if (received_message.text.includes("KH:")) {
      const query = received_message.text.split(": ");
      const keywordSearch = query[1];
      const res = await axios.get(
        `https://elearning-hungtrinh.herokuapp.com/api/courses?search=${keywordSearch}`
      );

      const data = res.data.courses;
      const result = data.map((course) => {
        return `${course.id} - ${course.courseName}\n`;
      });
      const courseResponse = result.join("\n");
      response = { text: `Khoá học bạn tìm kiếm là: \n${courseResponse}` };
    } else if (received_message.text.includes("Category:")) {
      const query = received_message.text.split(": ");
      const res = await axios.get(
        "https://elearning-hungtrinh.herokuapp.com/api/categories",
        { params: { category: query[1] } }
      );
      const data = res.data.listCourse;
      let result = "";
      for (var i = 0; i < data.length; i++) {
        result = result + `${data[i].id}-${data[i].name} \n`;
      }
      response = { text: `Danh mục gồm: \n${result}` };
    } else if (received_message.text.includes("Course:")) {
      const query = received_message.text.split(": ");
      const courseId = query[1].trim();
      const res = await axios.get(
        `https://elearning-hungtrinh.herokuapp.com/api/courses/${courseId}`
      );
      console.log("id:", courseId);
      console.log(res.data);
      const courseData = res.data;
      if (Object.keys(courseData).length === 1) {
        response = { text: "Không có khóa học phù hợp" };
      } else {
        const {
          courseName,
          rate,
          price,
          sale,
          currentStudent,
          shortDescription,
        } = courseData;
        const result = `Tên: ${courseName} \nĐánh giá: ${
          rate ? rate : 0
        } \nGiá: ${price} \nGiảm giá: ${
          sale ? sale : "Không giảm giá"
        } \nSố học sinh: ${
          currentStudent ? currentStudent : 0
        } \nMô tả khóa học: ${shortDescription}\n`;
        response = { text: `Thông tin: \n\n${result}` };
      }
    } else {
      response = {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [
              {
                title: "Chọn yêu cầu mà bạn muốn?",
                subtitle: "KH: Khóa học.",
                // "image_url": attachment_url,
                buttons: [
                  {
                    type: "postback",
                    title: "Tìm kiếm KH",
                    payload: "search",
                  },
                  {
                    type: "postback",
                    title: "Duyệt KH",
                    payload: "category",
                  },
                  {
                    type: "postback",
                    title: "Xem chi tiết KH",
                    payload: "course",
                  },
                ],
              },
            ],
          },
        },
      };
    }
  }

  callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
async function handlePostback(sender_psid, received_postback) {
  let response = null;
  const payload = received_postback.payload;

  switch (payload) {
    case "search":
      response = { text: `Hãy gõ theo cú pháp: ${"KH: <Từ cần tìm>"} !` };
      break;
    case "category":
      const res = await axios.get(
        "https://elearning-hungtrinh.herokuapp.com/api/categories"
      );
      const data = res.data;

      const result = data
        .filter((cat) => cat.cat_id !== null)
        .map((cat) => {
          const { catName, id } = cat;
          return {
            type: "postback",
            title: catName.slice(0, 19),
            payload: `cat ${id}`,
          };
        });

      response = {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: {
              title: "Chọn danh mục mà bạn mong muốn",
              subtitle: "Danh mục",
              buttons: result,
            },
          },
        },
      };
      break;
    case "course":
      response = {
        text: `Hãy gõ theo cú pháp: ${"Course: <ID cần tìm>"} !\nVí dụ: Course: 1\nNếu chưa biết thông tin, có thể tham khảo thông qua tìm kiếm khóa học và danh mục`,
      };
      break;
    case "GET_STARTED":
    case "RESTART_BOT":
      response = {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [
              {
                title: "Chọn yêu cầu mà bạn muốn?",
                subtitle: "KH: Khóa học.",
                buttons: [
                  {
                    type: "postback",
                    title: "Tìm kiếm KH",
                    payload: "search",
                  },
                  {
                    type: "postback",
                    title: "Duyệt KH",
                    payload: "category",
                  },
                  {
                    type: "postback",
                    title: "Xem chi tiết KH",
                    payload: "course",
                  },
                ],
              },
            ],
          },
        },
      };
      break;

    default:
      response = { text: `Không hiểu yêu cầu ${payload}` };
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    recipient: {
      id: sender_psid,
    },
    message: response,
  };

  // Send the HTTP request to the Messenger Platform
  request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: request_body,
    },
    (err, res, body) => {
      console.log("####################################");
      console.log(request_body);
      console.log("####################################");
      console.log(body);
      console.log("####################################");
      if (!err) {
        // console.log(req);
        console.log("message sent!");
      } else {
        console.error("Unable to send message:" + err);
      }
    }
  );
}

const setupProfile = async (req, res) => {
  // Construct the message body
  let request_body = {
    get_started: { payload: "GET_STARTED" },
    whitelisted_domains: ["https://elearning-hungtrinh.herokuapp.com/"],
  };

  // Send the HTTP request to the Messenger Platform
  await request(
    {
      uri: `https://graph.facebook.com/v11.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: request_body,
    },
    (err, res, body) => {
      console.log("####################################");
      console.log(request_body);
      console.log("####################################");
      console.log(body);
      console.log("####################################");
      if (!err) {
        // console.log(req);
        console.log("Setup profile succeeded!");
      } else {
        console.error("Unable to setup profile:" + err);
      }
    }
  );
};

const setupPersistentMenu = async (req, res) => {
  // Construct the message body
  let request_body = {
    persistent_menu: [
      {
        locale: "default",
        composer_input_disabled: false,
        call_to_actions: [
          {
            type: "postback",
            title: "Khởi động lại chatbot",
            payload: "RESTART_BOT",
          },
        ],
      },
    ],
  };

  // Send the HTTP request to the Messenger Platform
  await request(
    {
      uri: `https://graph.facebook.com/v11.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: request_body,
    },
    (err, res, body) => {
      if (!err) {
        // console.log(req);
        console.log("Setup persistent menu succeeded!");
      } else {
        console.error("Unable to setup persistent menu:" + err);
      }
    }
  );
};

module.exports = {
  getWebhook: getWebhook,
  postWebhook: postWebhook,
  setupProfile: setupProfile,
  setupPersistentMenu: setupPersistentMenu,
};
