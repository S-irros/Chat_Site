 const socket = io({
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      const messages = document.getElementById("messages");
      const form = document.getElementById("form");
      const message = document.getElementById("message");
      const systemMessage = document.getElementById("system-message");
      const send = document.getElementById("send");
      const leaveRoom = document.getElementById("leaveRoom");
      const roomItems = document.querySelectorAll("#rooms li");

      let page = 0;
      let limit = 50;
      let isLoading = false;
      let hasMore = true;

      function createMessageElement(msg, isPrepend = false) {
        const message = document.createElement("li");
        message.classList.add("MyMsgBlock");
        message.id = msg.id;

        const isOwnMessage = msg.userID === userID.toString();

        if (isOwnMessage) {
          message.classList.add("my-message");
        }

        const textSpan = document.createElement("span");
        textSpan.classList.add("MyMsg");

        if (!isOwnMessage) {
          textSpan.innerHTML = `<span class="userNameSpan">${msg.userName}</span>: ${msg.text}`;
        } else {
          textSpan.innerHTML = `${msg.text}`;
        }

        const timeSpan = document.createElement("span");
        timeSpan.textContent = `[${msg.time}]`;
        timeSpan.classList.add("msg-time");

        const deleteBtn = document.createElement("button");
        deleteBtn.classList.add("deleteBtn");
        deleteBtn.textContent = "X";
        deleteBtn.addEventListener("click", () => {
          console.log(currentRoom)
          fetch(`/api/messages/${msg.id}?room=${encodeURIComponent(currentRoom)}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })
            .then((response) => {
              if (!response.ok) {
                if (response.status === 401) {
                  systemMessage.textContent =
                    "Session expired. Please login again.";
                  setTimeout(() => {
                    showPage("login-page");
                  }, 3000);
                  return;
                }
                return response.json().then((data) => {
                  throw new Error(data.message || "Failed to delete");
                });
              }
              return response.json();
            })
            .then((data) => {
              const message = document.getElementById(msg.id);
              if (message) message.remove();
              systemMessage.textContent = "Message deleted successfully!";
              setTimeout(() => {
                systemMessage.textContent = "";
              }, 3000);
              fetchMessages();
            })
            .catch((err) => {
              console.error("Error deleting message: ", err.message);
              systemMessage.textContent = `Error: ${err.message}`;
              systemMessage.style.backgroundColor = "red";
              systemMessage.style.color = "white";
              setTimeout(() => {
                systemMessage.textContent = "";
              }, 5000);
            });
        });

        const editBtn = document.createElement("button");
        editBtn.classList.add("editBtn");
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
          const newText = prompt("Edit message:", msg.text);
          if (newText) {
            fetch(`/api/messages/${msg.id}?room=${encodeURIComponent(currentRoom)}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({ text: newText }),
            })
              .then((response) => {
                if (!response.ok) {
                  if (response.status === 401) {
                    systemMessage.textContent =
                      "Session expired. Please login again.";
                    setTimeout(() => {
                      showPage("login-page");
                    }, 3000);
                    return;
                  }
                  return response.json().then((data) => {
                    throw new Error(data.message || "Failed to update");
                  });
                }
                return response.json();
              })
              .then((data) => {
                const message = document.getElementById(msg.id);
                if (message) {
                  const msgText = message.querySelector("span:not(.msg-time)");
                  msgText.textContent = isOwnMessage
                    ? newText
                    : `${msg.userName}: ${newText}`;
                }
                systemMessage.textContent = "Message updated successfully!";
                setTimeout(() => {
                  systemMessage.textContent = "";
                }, 3000);
                fetchMessages(); // إعادة تحميل الرسايل
              })
              .catch((err) => {
                console.error("Error updating message: ", err.message);
                systemMessage.textContent = `Error: ${err.message}`;
                systemMessage.style.backgroundColor = "red";
                systemMessage.style.color = "white";
                setTimeout(() => {
                  systemMessage.textContent = "";
                }, 5000);
              });
          }
        });
        if (msg.userID.toString() === userID.toString()) {
          message.appendChild(deleteBtn);
          message.appendChild(editBtn);
        }

        message.appendChild(textSpan);
        message.appendChild(timeSpan);

        if (isPrepend) {
          messages.prepend(message);
        } else {
          messages.appendChild(message);
        }
      }

      async function fetchMessages() {
        if (isLoading || !hasMore) return;

        isLoading = true;
        const skip = page * limit;

        console.log("Fetching messages for room:", currentRoom); // تتبع الروم

        try {
          const response = await fetch(
            `/api/messages?room=${currentRoom}&skip=${skip}&limit=${limit}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(
              (await response.json().then((data) => data.message)) ||
                "Failed to fetch messages"
            );
          }

          const msgs = await response.json();
          console.log("Messages fetched:", msgs); // تتبع الرسايل
          if (msgs.length < limit) hasMore = false;

          const scrollHeightBefore = messages.scrollHeight;

          if (page === 0) {
            messages.innerHTML = "";
            if (msgs.length === 0) {
              const li = document.createElement("li");
              li.id = "no-messages";
              li.textContent = "No messages in this room yet.";
              messages.appendChild(li);
            } else {
              msgs.forEach((msg) => createMessageElement(msg));
              messages.scrollTo({
                top: messages.scrollHeight,
                behavior: "smooth",
              });
            }
          } else {
            msgs.forEach((msg) => createMessageElement(msg, true));
            const scrollHeightAfter = messages.scrollHeight;
            messages.scrollTop = scrollHeightAfter - scrollHeightBefore;
          }

          page++;
        } catch (err) {
          console.error("Error fetching messages: ", err.message);
          systemMessage.textContent = `Error: ${err.message}`;
          systemMessage.style.backgroundColor = "red";
          systemMessage.style.color = "white";
          setTimeout(() => {
            systemMessage.textContent = "";
          }, 3000);
        } finally {
          isLoading = false;
        }
      }

      messages.addEventListener("scroll", () => {
        if (messages.scrollTop <= 100 && !isLoading && hasMore) {
          fetchMessages();
        }
      });

      function joinRoom(e) {
        e.preventDefault();
        const selectedRoom = e.target.textContent.trim();
        currentRoom = selectedRoom;
        socket.emit("join room", {
          userName: userName,
          room: currentRoom,
        });

        leaveRoom.disabled = false;
        message.disabled = false;
        send.disabled = false;

        page = 0;
        hasMore = true;
        fetchMessages();
      }

      window.joinRoom = joinRoom;

      roomItems.forEach((roomItem) => {
        roomItem.addEventListener("click", joinRoom);
      });

      send.addEventListener("click", (e) => {
        e.preventDefault();
        if (!currentRoom) {
          systemMessage.textContent = "Please join a room first!";
          setTimeout(() => {
            systemMessage.textContent = "";
          }, 5000);
          return;
        }
        if (message.value.trim()) {
          socket.emit("chat message", {
            text: message.value,
            room: currentRoom,
            userName: userName,
            userID: userID,
          });
          message.value = "";
        } else {
          systemMessage.textContent = "Your message can't be empty!";
          setTimeout(() => {
            systemMessage.textContent = "";
          }, 5000);
        }
      });

      leaveRoom.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentRoom) {
          socket.emit("leave room", {
            userName: userName,
            room: currentRoom,
            userID,
          });
          messages.textContent = "";
          leaveRoom.disabled = true;
          message.disabled = true;
          send.disabled = true;
        } else {
          alert("You are not in a room yet");
        }
      });

      message.addEventListener("keydown", () => {
        // e.preventDefault();
        socket.emit("typing", {
          userName: userName,
          room: currentRoom,
          userID: userID,
        });
      });

      socket.on("chat message", (data) => {

        if (!data.time && data.createdAt) {
          data.time = new Date(data.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        }

        const noMessagesElement = document.getElementById("no-messages");
        if (noMessagesElement) {
          noMessagesElement.remove();
        }
        createMessageElement(data);
        messages.scrollTo({
          top: messages.scrollHeight,
          behavior: "smooth",
        });
      });

      socket.on("join room", (data) => {
        if (data.userID) {
          userID = data.userID;
        }
      });

      socket.on("system messages", (msg) => {
        systemMessage.textContent = msg;
        setTimeout(() => {
          systemMessage.textContent = "";
        }, 5000);
      });

      socket.on("delete message", (data) => {
        const message = document.getElementById(data.msgID);
        if (message) {
          message.remove();
          fetchMessages();
        } else {
          console.warn("Message not found in DOM for deletion:", data.msgID);
          fetchMessages();
        }
      });

      socket.on("update message", (data) => {
        const message = document.getElementById(data.id);
        if (message) {
          const msgText = message.querySelector("span:not(.msg-time)");
          msgText.textContent = `${data.userName}: ${data.text}`;
        } else {
          fetchMessages(); // لو مش موجود، جيب الرسايل من جديد
        }
      });

      socket.on("disconnect", (data) => {
        alert("You have been disconnected from the server");
        location.reload();
      });

      async function logout() {
        localStorage.removeItem("token");
        userID = null;
        currentRoom = null;

        socket.emit("leave room", {
          userName: userName,
          room: currentRoom,
          userID,
        });
        showPage("login-page");
        alert("Logged out successfully!");
      }