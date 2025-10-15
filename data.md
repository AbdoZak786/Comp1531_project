```javascript
let userData = [
  {
    userId: 5481970,
    nameFirst: "Yifan",
    nameLast: "Liang",
    email: "z5481970@ad.unsw.edu.au",
    password: "iLoveComp1531!",
    numSuccessfulLogins: 3,
    numFailedPasswordsSinceLastLogin: 1,
    ownedQuizzes: [4,23,25,2]
  }
]

let quizData = [
  {
    quizId: 23,
    name: 'My Quiz',
    timeCreated: 1683125870,
    timeLastEdited: 1683125871,
    description: 'This is my quiz',
    createdBy: 5481970
  }
]


```

There are two separate data structures for users and quizzes respectively. They are not disjoint as userData contains information that can be used to locate objects in quizData in a one to many configuration (one user many quizzes).
