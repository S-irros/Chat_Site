
// ** Testing for Updateing msg **

// const messageController = require("../controllers/messageController");

// jest.mock("../models/messageModel.js", () => ({
//   findOneAndUpdate: jest.fn(),
// }));

// jest.mock("../models/userModel.js", () => ({
//   findById: jest.fn(),
// }));

// jest.mock("Redis", () => ({
//   createClient: () => ({
//     get: jest.fn(),
//     setEx: jest.fn(),
//     keys: jest.fn(),
//     del: jest.fn(),
//     on: jest.fn(),
//     connect: jest.fn(),
//   })
// }));

// describe("updateMessage", () => {
//   test("should first update message in data base", async () => {
//     const req = {
//       params: { id: "1" },
//       user: { id: "123" },
//       body: { text: "new text" },
//       query: { room: "room1" },
//       model: {
//         User: {
//           findById: jest.fn().mockResolvedValue({ userID: '123' }),
//         },
//         Message: {
//           findOneAndUpdate: jest.fn().mockResolvedValue({
//             _id: '1',
//             text: 'new text',
//             userID: '123',
//             room: 'room1'
//           }),
//         },
//       },
//     };

//     const res = {
//       status: jest.fn().mockReturnThis(),
//       json: jest.fn().mockReturnThis(),
//     };

//     const io = {
//       to: jest.fn().mockReturnThis(),
//       emit: jest.fn()
//     };

//     const redisClient = {
//       get: jest.fn().mockResolvedValue(null),
//       setEx: jest.fn(),
//       keys: jest.fn().mockResolvedValue([]),
//       del: jest.fn(),
//     };

//     await messageController.updateMessage(req, res, io, redisClient);

//     expect(res.status).toHaveBeenCalledWith(200);
//     expect(io.emit).toHaveBeenCalledWith('update message',
//         expect.objectContaining({
//           id: '1',
//           text: 'new text'
//         })
//     )
//   });

//   test('should return 400 if the text is invalid', async () => { 
//     const req = {
//       params: {
//         id: '1'
//       },
//       user: {
//         id: '123'
//       },
//       body: {
//         text: ''
//       },
//       query: {
//         room: 'room1'
//       },
//       model: {
//         User: {
//           findById: jest.fn()
//         },
//         Message: {
//           findOneAndUpdate: jest.fn()
//         }
//       }
//     };

//     const res = {
//       status: jest.fn().mockReturnThis(),
//       json: jest.fn()
//     };

//     const io = {
//       to: jest.fn().mockReturnThis(),
//       emit: jest.fn()
//     };

//     const redisClient = {
//       keys: jest.fn().mockResolvedValue([]),
//       del: jest.fn()
//     };

//     await messageController.updateMessage(req, res, io, redisClient);

//     expect(res.status).toHaveBeenCalledWith(400);
//     expect(res.json).toHaveBeenCalledWith({
//       message: 'Please enter all fields'
//     });
//    })
// });


















// ** Testing for Deleting msg:

const messageController = require("../controllers/messageController");

jest.mock("../models/messageModel.js", () => ({
  findById: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

jest.mock("../models/userModel.js", () => ({
  findById: jest.fn()
}));

jest.mock("Redis", () => ({
  createClient: () => ({
    get: jest.fn(),
    setEx: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
  })
}));

describe("deleteMessage", () => {
  test('should delete message successfully if user is authorized.', async() => {
    const req = {
      params: {
        id: '1'
      },
      query: {
        room: 'room1'
      },
      user: {
        id: '123',
        role: 'User'
      },
      model: {
        User: {
          findById: jest.fn().mockResolvedValue({
            _id: '123',
            rooms: ["room1"]
          })
        },
        Message: {
          findById: jest.fn().mockResolvedValue({ 
            _id: '1',
            userID: '123',
            room: 'room1'
           }),
          findByIdAndDelete: jest.fn().mockResolvedValue({ 
            _id: '1',
            userID: '123',
            room: 'room1'
           })
        }
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    const io = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    }

    const redisClient = {
      get: jest.fn().mockResolvedValue([]),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
    }

    await messageController.deleteMessage(req ,res ,io ,redisClient);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(io.emit).toHaveBeenCalledWith("delete message",
      expect.objectContaining({
        userID: '123',
        msgID: '1',
        room: 'room1'
      })
    )

  });

  test('should return 403 if user is not authorized', async() => {
    const req = {
      params: {
        id: '1'
      },
      query: {
        room: 'room1'
      },
      user: {
        id: '456',
        role: 'User'
      },
      model: {
        User: {
          findById: jest.fn().mockResolvedValue({ 
            _id: '456',
            rooms: ['room1']
           })
        },
        Message: {
          findById: jest.fn().mockResolvedValue({ 
            _id: '1',
            userID: '123',
            room: 'room1'
           })
        }
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    const io = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    }

    const redisClient = {
      get: jest.fn().mockResolvedValue([]),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([])
    }

    await messageController.deleteMessage(req ,res ,io ,redisClient);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(io.emit).toHaveBeenCalledWith(
      'system messages',
      'You are not authorized to delete this message'
    );
    expect(res.json).toHaveBeenCalledWith({
      message: "You are not authorized to delete this message"
    });
  })
})