/**
 * Faculty-authored demo content for the seeded DBMS topics (A.9): a curiosity hook, a video,
 * an easy explanation, a 10-mark answer, real-world examples, flashcards, MCQs and code-lab
 * SQL problems for every topic. Seeded as published by the subject's faculty.
 *
 * Videos are public YouTube lectures, each checked to exist (title and channel noted) on
 * 2026-10-21. Faculty can replace any of them in the studio.
 */

// ---------- shared SQL datasets for the code lab ----------

const COLLEGE = `
CREATE TABLE departments (dept_id TEXT PRIMARY KEY, dept_name TEXT NOT NULL, hod TEXT NOT NULL);
CREATE TABLE students (
  reg_no TEXT PRIMARY KEY, name TEXT NOT NULL, dept_id TEXT REFERENCES departments(dept_id),
  year INTEGER NOT NULL, cgpa REAL
);
INSERT INTO departments VALUES
  ('CSE', 'Computer Science and Engineering', 'Dr. Meena R'),
  ('ECE', 'Electronics and Communication Engineering', 'Dr. Senthil K'),
  ('MECH', 'Mechanical Engineering', 'Dr. Prakash V');
INSERT INTO students VALUES
  ('23CS001', 'Aarthi', 'CSE', 3, 8.4),
  ('23CS002', 'Bharath', 'CSE', 3, 7.1),
  ('22CS014', 'Divya', 'CSE', 4, 9.0),
  ('22EC007', 'Karthik', 'ECE', 4, 6.8),
  ('24ME003', 'Lakshmi', 'MECH', 2, 7.9),
  ('22ME011', 'Naveen', 'MECH', 4, 8.1);`;

const COLLEGE_HIDDEN = `
INSERT INTO departments VALUES ('EEE', 'Electrical and Electronics Engineering', 'Dr. Usha N');
INSERT INTO students VALUES
  ('22EE002', 'Pooja', 'EEE', 4, 8.7),
  ('25CS010', 'Rahul', 'CSE', 1, NULL),
  ('22CS020', 'Sneha', 'CSE', 4, 7.4);`;

const MESS = `
CREATE TABLE mess_register (
  reg_no TEXT PRIMARY KEY, name TEXT, room TEXT, warden TEXT, warden_phone TEXT
);
INSERT INTO mess_register VALUES
  ('23CS001', 'Aarthi', 'A-101', 'Mr. Kumar', '9443000001'),
  ('23CS002', 'Bharath', 'B-204', 'Mr. Kumar', '9443000001'),
  ('22CS014', 'Divya', 'A-102', 'Mrs. Revathi', '9443000002'),
  ('22EC007', 'Karthik', 'B-210', 'Mr. Kumar', '9443000001'),
  ('24ME003', 'Lakshmi', 'A-115', 'Mrs. Revathi', '9443000002');`;

const MESS_HIDDEN = `
INSERT INTO mess_register VALUES
  ('22ME011', 'Naveen', 'B-221', 'Mr. Kumar', '9443000001'),
  ('22EE002', 'Pooja', 'A-120', 'Mrs. Revathi', '9443000002'),
  ('25CS010', 'Rahul', 'B-230', 'Mr. Kumar', '9443000001');`;

// ---------- per-topic content ----------

export const DBMS_CONTENT = {
  relational: {
    video: {
      title: 'Introduction to Relational Data Model (Neso Academy)',
      url: 'https://www.youtube.com/watch?v=Q45sr5p_NmQ',
    },
    curiosity:
      'The exam cell keeps marks in an Excel sheet. Someone sorts only the "Marks" column and every student gets another student\'s marks. Why can a database table never break like this?',
    curiosityQuestion: {
      stem: 'Why does sorting a database table never mix up which marks belong to which student?',
      options: [
        'Databases do not allow sorting',
        'Each row (tuple) is one complete fact, so its values always move together',
        'The database keeps a backup copy',
      ],
      correctIndex: 1,
      explanation:
        'In the relational model a tuple is a single fact about one student. Its attribute values belong together, and row order does not matter.',
    },
    easy: 'The relational model stores data in **tables**, which it calls **relations**.\n\n- Each **row** is a *tuple*: one complete fact, like one student.\n- Each **column** is an *attribute*: one property, like Name or CGPA.\n- Every attribute takes values from a **domain**: CGPA is a number from 0 to 10, Year is 1 to 4.\n\nThink of the attendance register: each line is one student (a tuple), and each column heading is an attribute. The **schema** is the heading line; the **instance** is the data written below it today.',
    tenMark:
      '## Definition\nThe relational model, proposed by E. F. Codd in 1970, represents a database as a collection of relations. A relation is a table with rows (tuples) and columns (attributes).\n\n## Terminology\n- **Relation:** a table, e.g. STUDENT.\n- **Tuple:** a row; one record.\n- **Attribute:** a named column.\n- **Domain:** the set of allowed values of an attribute.\n- **Degree:** the number of attributes.\n- **Cardinality:** the number of tuples.\n- **Relation schema:** R(A1, A2, …, An), e.g. STUDENT(RegNo, Name, Dept, CGPA).\n- **Relation instance:** the set of tuples at a given moment.\n\n## Properties of a relation\n1. Each cell holds an atomic value.\n2. No two tuples are identical.\n3. The order of tuples does not matter.\n4. The order of attributes does not matter.\n5. Each attribute has a distinct name.\n\n## Integrity constraints\n- **Domain constraint:** values must come from the domain.\n- **Key constraint:** no two tuples share a key value.\n- **Entity integrity:** a primary key cannot be NULL.\n- **Referential integrity:** a foreign key must match an existing primary key or be NULL.\n\n## Example\nSTUDENT(RegNo, Name, Dept, CGPA) with 6 students has degree 4 and cardinality 6.\n\n## Advantages\n- Simple tabular view; easy to query with SQL.\n- Data independence: storage can change without changing programs.\n- A firm mathematical base (set theory, relational algebra).\n\n## Conclusion\nThe relational model is the foundation of MySQL, PostgreSQL, Oracle and SQL Server, and of the rest of this unit.',
    realWorld:
      '- **College ERP:** Students, Courses and Enrolments are three relations; your hall ticket is a query that joins them.\n- **IRCTC:** a ticket is a tuple in a Bookings relation, linked to Trains and Passengers relations.\n- **Banking (UPI):** every transaction is a tuple with attributes like sender, receiver, amount and time.\n- **Hospital records:** Patients, Doctors and Appointments are relations; the appointment slip is one tuple.',
    flashcards: [
      ['What is a relation?', 'A table with rows (tuples) and columns (attributes).'],
      ['What is a tuple?', 'One row of a relation: a single complete record.'],
      [
        'Degree vs cardinality?',
        'Degree = number of attributes (columns); cardinality = number of tuples (rows).',
      ],
      ['What is a domain?', 'The set of values an attribute is allowed to take.'],
      [
        'Schema vs instance?',
        'Schema is the structure R(A1…An); instance is the data in it at one moment.',
      ],
    ],
    mcqs: [
      {
        stem: 'In the relational model, a row of a table is called a…',
        options: ['Attribute', 'Tuple', 'Domain', 'Schema'],
        correctIndex: 1,
        explanation: 'Rows are tuples; columns are attributes.',
        optionExplanations: [
          'An attribute is a column.',
          'Correct.',
          'A domain is a set of allowed values.',
          'A schema is the structure, not a row.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'STUDENT(RegNo, Name, Dept, CGPA) holds 60 students. What is its degree?',
        options: ['60', '4', '64', '1'],
        correctIndex: 1,
        explanation: 'Degree counts attributes: RegNo, Name, Dept, CGPA = 4.',
        optionExplanations: [
          '60 is the cardinality.',
          'Correct.',
          'Degree and cardinality are not added.',
          'There are four attributes.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Who proposed the relational model?',
        options: ['Peter Chen', 'E. F. Codd', 'Charles Bachman', 'Raymond Boyce'],
        correctIndex: 1,
        explanation: 'E. F. Codd proposed it at IBM in 1970.',
        optionExplanations: [
          'Chen proposed the ER model.',
          'Correct.',
          'Bachman worked on the network model.',
          'Boyce co-defined BCNF with Codd.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which property is TRUE for a relation?',
        options: [
          'Tuples must be stored in sorted order',
          'Duplicate tuples are allowed',
          'The order of tuples does not matter',
          'A cell may hold a list of values',
        ],
        correctIndex: 2,
        explanation: 'A relation is a set of tuples, and sets have no order.',
        optionExplanations: [
          'Order is not part of a relation.',
          'A set has no duplicates.',
          'Correct.',
          'Cells must be atomic.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'A foreign key value must either be NULL or match an existing primary key value. This is…',
        options: [
          'Entity integrity',
          'Domain constraint',
          'Referential integrity',
          'Key constraint',
        ],
        correctIndex: 2,
        explanation: 'Referential integrity keeps references between relations valid.',
        optionExplanations: [
          'Entity integrity says a primary key cannot be NULL.',
          'Domain constraints limit values of one attribute.',
          'Correct.',
          'Key constraints forbid duplicate keys.',
        ],
        difficulty: 'medium',
      },
    ],
    challenges: [
      {
        title: 'Final-year students',
        difficulty: 'easy',
        prompt:
          'The placement cell needs every **final-year** (year 4) student.\n\nReturn `reg_no` and `name`, ordered by `reg_no`.',
        setupSql: COLLEGE,
        hiddenSql: COLLEGE_HIDDEN,
        starterCode: 'SELECT reg_no, name\nFROM students\n-- filter and sort here\n;',
        solution: 'SELECT reg_no, name FROM students WHERE year = 4 ORDER BY reg_no;',
        orderMatters: true,
        hints: ['Use WHERE year = 4.', 'Finish with ORDER BY reg_no.'],
      },
      {
        title: 'Degree and cardinality',
        difficulty: 'medium',
        prompt:
          'Return **one row with two columns** for the `students` relation:\n\n1. its **degree** (number of attributes)\n2. its **cardinality** (number of tuples)\n\nDo not type the numbers in: your query must still be right when students are added.',
        setupSql: COLLEGE,
        hiddenSql: COLLEGE_HIDDEN,
        starterCode:
          "SELECT\n  (SELECT count(*) FROM pragma_table_info('students')) AS degree,\n  -- cardinality here\n;",
        solution:
          "SELECT (SELECT count(*) FROM pragma_table_info('students')) AS degree, (SELECT count(*) FROM students) AS cardinality;",
        orderMatters: false,
        hints: [
          "pragma_table_info('students') has one row per column.",
          'count(*) on the table counts its tuples.',
        ],
      },
    ],
  },

  keys: {
    video: {
      title: 'Database Keys Made Easy (Decomplexify)',
      url: 'https://www.youtube.com/watch?v=8wUUMOKAK-c',
    },
    curiosity:
      'Two students in your class are both called "Priya S". The canteen marks lunch by name. Who gets charged when one of them eats twice?',
    curiosityQuestion: {
      stem: 'How should the canteen tell the two "Priya S" apart?',
      options: [
        'By name and seat',
        'By register number, which is unique for every student',
        'By the time they eat',
      ],
      correctIndex: 1,
      explanation:
        'A key is an attribute that identifies exactly one tuple. Names repeat; the register number never does.',
    },
    easy: "A **key** is a column (or a set of columns) that picks out **exactly one row**.\n\n- **Super key:** any set of columns that is unique, even with extra columns (RegNo + Name).\n- **Candidate key:** a super key with nothing extra to remove (RegNo, or Email).\n- **Primary key:** the candidate key we choose (RegNo).\n- **Alternate key:** the other candidate keys (Email).\n- **Foreign key:** a column that points to a primary key in another table (DeptId in STUDENT points to DEPARTMENT).\n\nYour register number is your primary key in college; your Aadhaar number is the country's key for you.",
    tenMark:
      '## Definition\nA key is a minimal set of attributes whose values uniquely identify each tuple of a relation.\n\n## Types of keys\n1. **Super key:** any set of attributes that uniquely identifies tuples, e.g. {RegNo}, {RegNo, Name}.\n2. **Candidate key:** a minimal super key; no proper subset is unique, e.g. {RegNo}, {Email}.\n3. **Primary key:** the candidate key chosen by the designer; it cannot be NULL (entity integrity).\n4. **Alternate key:** candidate keys not chosen as primary.\n5. **Composite key:** a key made of two or more attributes, e.g. {RegNo, CourseCode} in ENROLMENT.\n6. **Foreign key:** attributes in one relation that refer to the primary key of another (referential integrity).\n\n## Example\nSTUDENT(RegNo, Name, Email, DeptId) and DEPARTMENT(DeptId, DeptName).\n- Super keys: {RegNo}, {Email}, {RegNo, Name}, …\n- Candidate keys: {RegNo}, {Email}\n- Primary key: RegNo; alternate key: Email\n- Foreign key: STUDENT.DeptId → DEPARTMENT.DeptId\n\n## Relationship\nEvery candidate key is a super key; every primary key is a candidate key. Not every super key is a candidate key.\n\n## Importance\n- Prevents duplicate records.\n- Links relations through foreign keys.\n- Lets the DBMS build indexes for fast lookup.\n\n## Conclusion\nKeys enforce uniqueness and connect relations; functional dependencies and normalization are built on them.',
    realWorld:
      "- **Aadhaar:** the 12-digit number is a primary key for residents across government systems.\n- **Vehicle registration (TN 01 AB 1234):** a key in the RTO database; challans refer to it as a foreign key.\n- **Bank account:** account number is the primary key; IFSC + account number together identify an account across banks (a composite key).\n- **Online shopping:** an order's customer_id is a foreign key to the Customers table, so deleting a customer cannot leave orphan orders.",
    flashcards: [
      [
        'What is a candidate key?',
        'A minimal super key: unique, with no attribute that can be removed.',
      ],
      [
        'Super key vs candidate key?',
        'A super key may have extra attributes; a candidate key is minimal.',
      ],
      ['What is an alternate key?', 'A candidate key that was not chosen as the primary key.'],
      ['What is a foreign key?', 'Attributes that refer to the primary key of another relation.'],
      [
        'What is a composite key?',
        'A key made of two or more attributes, e.g. (RegNo, CourseCode).',
      ],
    ],
    mcqs: [
      {
        stem: 'A minimal super key is called a…',
        options: ['Foreign key', 'Candidate key', 'Composite key', 'Alternate key'],
        correctIndex: 1,
        explanation: 'Candidate keys are super keys with no redundant attribute.',
        optionExplanations: [
          'Foreign keys refer to another table.',
          'Correct.',
          'Composite keys have several attributes but need not be minimal super keys by definition.',
          'Alternate keys are unchosen candidate keys.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which key can never be NULL?',
        options: ['Foreign key', 'Alternate key', 'Primary key', 'Super key'],
        correctIndex: 2,
        explanation: 'Entity integrity forbids NULL in the primary key.',
        optionExplanations: [
          'A foreign key may be NULL.',
          'Alternate keys are not forced to be NOT NULL by the model.',
          'Correct.',
          'Not every super key is enforced.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'R(A, B, C) has candidate keys {A} and {B, C}. How many of these are super keys: {A}, {A,B}, {B}, {B,C}?',
        options: ['1', '2', '3', '4'],
        correctIndex: 2,
        explanation: '{A}, {A,B} and {B,C} are unique; {B} alone is not.',
        optionExplanations: [
          'More than one set contains a key.',
          '{A,B} also contains A.',
          'Correct.',
          '{B} alone is not a key.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'ENROLMENT(RegNo, CourseCode, Grade): which is the most natural primary key?',
        options: ['RegNo', 'CourseCode', '(RegNo, CourseCode)', 'Grade'],
        correctIndex: 2,
        explanation:
          'A student takes many courses and a course has many students, so only the pair is unique.',
        optionExplanations: [
          'A student has many enrolments.',
          'A course has many students.',
          'Correct.',
          'Grades repeat.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'Deleting a department that still has students fails. Which constraint caused this?',
        options: [
          'Domain constraint',
          'Referential integrity',
          'Entity integrity',
          'Check constraint',
        ],
        correctIndex: 1,
        explanation: "Students' DeptId foreign keys would point to nothing.",
        optionExplanations: [
          'Domains limit values of one column.',
          'Correct.',
          'Entity integrity is about NULL primary keys.',
          'No CHECK condition is involved.',
        ],
        difficulty: 'medium',
      },
    ],
    challenges: [
      {
        title: 'Can phone be a key?',
        difficulty: 'easy',
        prompt:
          'The admission office wants to use `phone` as the key of `applicants`.\n\nProve it cannot: list every `phone` shared by **more than one** applicant, with the number of applicants as `n`.',
        setupSql: `CREATE TABLE applicants (app_no INTEGER PRIMARY KEY, name TEXT, phone TEXT, city TEXT);
INSERT INTO applicants VALUES
  (1, 'Arun', '9840011111', 'Puducherry'),
  (2, 'Anitha', '9840011111', 'Puducherry'),
  (3, 'Bala', '9840022222', 'Villupuram'),
  (4, 'Chitra', '9840033333', 'Cuddalore'),
  (5, 'Deepak', '9840033333', 'Cuddalore'),
  (6, 'Esther', '9840044444', 'Chennai');`,
        hiddenSql: `INSERT INTO applicants VALUES
  (7, 'Farhan', '9840044444', 'Chennai'),
  (8, 'Gokul', '9840055555', 'Karaikal'),
  (9, 'Hema', '9840011111', 'Puducherry');`,
        starterCode: 'SELECT phone, count(*) AS n\nFROM applicants\n-- group and filter here\n;',
        solution: 'SELECT phone, count(*) AS n FROM applicants GROUP BY phone HAVING count(*) > 1;',
        orderMatters: false,
        hints: [
          'GROUP BY phone gives one group per phone number.',
          'HAVING filters groups: HAVING count(*) > 1.',
        ],
      },
      {
        title: 'Broken foreign keys',
        difficulty: 'medium',
        prompt:
          '`enrolments.reg_no` should be a foreign key to `students.reg_no`, but the old system never enforced it.\n\nFind the **orphan** enrolments: return `reg_no` and `course_code` of every enrolment whose student does not exist.',
        setupSql: `${COLLEGE}
CREATE TABLE enrolments (reg_no TEXT, course_code TEXT, grade TEXT, PRIMARY KEY (reg_no, course_code));
INSERT INTO enrolments VALUES
  ('23CS001', 'CS T53', 'A'), ('23CS002', 'CS T53', 'B'),
  ('21CS099', 'CS T53', 'C'), ('22EC007', 'EC T51', 'B'),
  ('20ME050', 'ME T42', 'A');`,
        hiddenSql: `INSERT INTO enrolments VALUES ('19CS001', 'CS T53', 'B'), ('22CS014', 'CS T54', 'S');`,
        starterCode:
          'SELECT e.reg_no, e.course_code\nFROM enrolments e\n-- find rows with no matching student\n;',
        solution:
          'SELECT e.reg_no, e.course_code FROM enrolments e LEFT JOIN students s ON s.reg_no = e.reg_no WHERE s.reg_no IS NULL;',
        orderMatters: false,
        hints: [
          'A LEFT JOIN keeps enrolments even when no student matches.',
          'Unmatched rows have NULL in the student columns.',
        ],
      },
    ],
  },

  fd: {
    video: {
      title: "Functional dependency in DBMS (Jenny's Lectures)",
      url: 'https://www.youtube.com/watch?v=dR-jJimWWHA',
    },
    curiosity:
      "If you know a student's register number, you know their name. If you know their name, do you always know their register number?",
    curiosityQuestion: {
      stem: 'Which statement is always true in a college database?',
      options: ['Name → RegNo', 'RegNo → Name', 'Both directions always hold'],
      correctIndex: 1,
      explanation:
        'RegNo decides Name (RegNo → Name). Two students can share a name, so Name does not decide RegNo.',
    },
    easy: 'A **functional dependency** X → Y means: **if two rows have the same X, they must have the same Y**. "X decides Y."\n\n- RegNo → Name: one register number, one name.\n- Pincode → City: 605001 is always Puducherry.\n- Dept → HOD: each department has one HOD.\n\nIt is a rule about the *meaning* of the data, not about one table today. We use FDs to find keys and to decide how to split tables during normalization.',
    tenMark:
      "## Definition\nIn a relation R, a functional dependency X → Y holds if any two tuples that agree on X also agree on Y. X is the determinant; Y is the dependent.\n\n## Types\n1. **Trivial:** Y ⊆ X, e.g. {RegNo, Name} → Name.\n2. **Non-trivial:** Y ⊄ X, e.g. RegNo → Name.\n3. **Full:** Y depends on all of X, not on a proper subset.\n4. **Partial:** Y depends on part of a composite key (removed by 2NF).\n5. **Transitive:** X → Y and Y → Z give X → Z with Y not a key (removed by 3NF).\n\n## Armstrong's axioms\n- **Reflexivity:** if Y ⊆ X then X → Y.\n- **Augmentation:** if X → Y then XZ → YZ.\n- **Transitivity:** if X → Y and Y → Z then X → Z.\nDerived rules: union, decomposition, pseudo-transitivity.\n\n## Closure\nX⁺ is the set of attributes determined by X. If X⁺ contains every attribute of R, X is a super key.\n\n## Example\nSTUDENT(RegNo, Name, Dept, HOD): RegNo → Name, RegNo → Dept, Dept → HOD.\nRegNo⁺ = {RegNo, Name, Dept, HOD}, so RegNo is a key, and RegNo → HOD is transitive.\n\n## Uses\n- Finding candidate keys.\n- Testing normal forms and guiding decomposition.\n\n## Conclusion\nFunctional dependencies capture real-world rules and are the basis of normalization.",
    realWorld:
      '- **India Post:** Pincode → Post office district. A form that lets you type a different district for the same pincode breaks this FD.\n- **GST:** GSTIN → Business legal name; invoices only need to store the GSTIN.\n- **IRCTC:** Train number → Train name; the name is stored once in the Trains table.\n- **IFSC → Bank branch:** UPI apps look up the branch from the IFSC instead of asking you to type it.',
    flashcards: [
      ['What does X → Y mean?', 'Tuples that agree on X must agree on Y; X determines Y.'],
      ['What is a trivial FD?', 'X → Y where Y is a subset of X.'],
      ["Armstrong's three axioms?", 'Reflexivity, augmentation and transitivity.'],
      ['What is the closure X⁺?', 'All attributes functionally determined by X.'],
      [
        'How do you test if X is a super key?',
        'Compute X⁺; if it contains all attributes, X is a super key.',
      ],
    ],
    mcqs: [
      {
        stem: 'If RegNo → Dept and Dept → HOD, then RegNo → HOD by…',
        options: ['Reflexivity', 'Augmentation', 'Transitivity', 'Union'],
        correctIndex: 2,
        explanation: 'X → Y and Y → Z give X → Z.',
        optionExplanations: [
          'Reflexivity gives trivial FDs.',
          'Augmentation adds attributes to both sides.',
          'Correct.',
          'Union combines right-hand sides.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which FD is trivial?',
        options: ['RegNo → Name', '{RegNo, Name} → RegNo', 'Dept → HOD', 'Pincode → City'],
        correctIndex: 1,
        explanation: 'The right side is part of the left side.',
        optionExplanations: [
          'Name is not part of RegNo.',
          'Correct.',
          'HOD is not part of Dept.',
          'City is not part of Pincode.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'R(A, B, C, D) with A → B, B → C, C → D. What is A⁺?',
        options: ['{A}', '{A, B}', '{A, B, C}', '{A, B, C, D}'],
        correctIndex: 3,
        explanation: 'A gives B, B gives C, C gives D.',
        optionExplanations: [
          'A at least determines B.',
          'Keep applying the FDs.',
          'C → D adds D.',
          'Correct.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'In ENROL(RegNo, Course, Grade, CourseTitle), Course → CourseTitle is a…',
        options: [
          'Full dependency',
          'Partial dependency',
          'Trivial dependency',
          'Multivalued dependency',
        ],
        correctIndex: 1,
        explanation: 'CourseTitle depends on Course, only part of the key (RegNo, Course).',
        optionExplanations: [
          'It does not need the whole key.',
          'Correct.',
          'CourseTitle is not part of Course.',
          'This is an ordinary FD.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'Two rows have Pincode 605001 and cities "Puducherry" and "Karaikal". This shows that…',
        options: [
          'Pincode → City is violated in this data',
          'City → Pincode holds',
          'Pincode is a primary key',
          'Nothing about FDs',
        ],
        correctIndex: 0,
        explanation: 'Same determinant, different dependent values: the FD does not hold here.',
        optionExplanations: [
          'Correct.',
          'Nothing is shown about City → Pincode.',
          'The pincode repeats, so it is not a key.',
          'Equal X with different Y is exactly an FD violation.',
        ],
        difficulty: 'medium',
      },
    ],
    challenges: [
      {
        title: 'Does Dept → HOD hold?',
        difficulty: 'medium',
        prompt:
          'The staff register should satisfy the functional dependency **dept → hod**.\n\nList every `dept` that **violates** it (has more than one distinct HOD).',
        setupSql: `CREATE TABLE staff_log (emp_id INTEGER PRIMARY KEY, name TEXT, dept TEXT, hod TEXT);
INSERT INTO staff_log VALUES
  (1, 'Arul', 'CSE', 'Dr. Meena R'), (2, 'Banu', 'CSE', 'Dr. Meena R'),
  (3, 'Charles', 'ECE', 'Dr. Senthil K'), (4, 'Devi', 'ECE', 'Dr. Senthil Kumar'),
  (5, 'Elango', 'MECH', 'Dr. Prakash V');`,
        hiddenSql: `INSERT INTO staff_log VALUES
  (6, 'Fathima', 'MECH', 'Dr. Ravi S'), (7, 'Ganesh', 'CSE', 'Dr. Meena R'),
  (8, 'Indhu', 'EEE', 'Dr. Usha N');`,
        starterCode: 'SELECT dept\nFROM staff_log\n-- group and filter here\n;',
        solution: 'SELECT dept FROM staff_log GROUP BY dept HAVING count(DISTINCT hod) > 1;',
        orderMatters: false,
        hints: [
          'Group the rows by the determinant (dept).',
          'count(DISTINCT hod) > 1 means the FD fails for that dept.',
        ],
      },
      {
        title: 'Check Pincode → City',
        difficulty: 'medium',
        prompt:
          'Return a single value `holds`: **1** if the FD `pincode → city` holds in `addresses`, otherwise **0**.',
        setupSql: `CREATE TABLE addresses (id INTEGER PRIMARY KEY, name TEXT, pincode TEXT, city TEXT);
INSERT INTO addresses VALUES
  (1, 'Aarthi', '605001', 'Puducherry'), (2, 'Bharath', '605001', 'Puducherry'),
  (3, 'Divya', '609602', 'Karaikal'), (4, 'Karthik', '607001', 'Cuddalore');`,
        hiddenSql: `INSERT INTO addresses VALUES (5, 'Lakshmi', '609602', 'Puducherry');`,
        starterCode: 'SELECT\n  -- 1 if no pincode has two cities, else 0\n  AS holds;',
        solution:
          'SELECT CASE WHEN EXISTS (SELECT 1 FROM addresses GROUP BY pincode HAVING count(DISTINCT city) > 1) THEN 0 ELSE 1 END AS holds;',
        orderMatters: false,
        hints: [
          'Find pincodes with more than one distinct city.',
          'Wrap it in CASE WHEN EXISTS (…) THEN 0 ELSE 1 END.',
        ],
      },
    ],
  },

  anomalies: {
    video: {
      title: 'Normalization and Data Anomalies (Ritu Kapur Classes)',
      url: 'https://www.youtube.com/watch?v=7Vmd_SiuhX4',
    },
    curiosity:
      'Your college stores course details only in the enrolment sheet. A new elective is announced, but nobody has enrolled yet. Where do you write down its title and credits?',
    curiosityQuestion: {
      stem: "A new course has no students yet. Why can't it be added to the ENROLMENT(RegNo, Course, Title) table?",
      options: [
        'Course titles are too long',
        'Every row needs a RegNo, so the course cannot exist without a student',
        'Tables cannot hold new courses',
      ],
      correctIndex: 1,
      explanation:
        'That is an insertion anomaly: one fact cannot be stored without an unrelated fact.',
    },
    easy: "When one table mixes different facts, three problems (anomalies) appear:\n\n- **Insertion anomaly:** you cannot add a fact until another fact exists (a new course with no students).\n- **Update anomaly:** one change must be repeated in many rows; miss one and the data disagrees (the warden's phone on 300 lines).\n- **Deletion anomaly:** deleting one fact loses another (the only student of a course leaves, and the course details vanish).\n\nAll three come from **redundancy**. Normalization removes them by keeping each fact in its own table.",
    tenMark:
      '## Definition\nAnomalies are problems that arise when inserting, updating or deleting data in a poorly designed relation that stores redundant information.\n\n## Example relation\nSTUDENT_COURSE(RegNo, Name, CourseCode, CourseTitle, Faculty, FacultyPhone)\n\n## 1. Insertion anomaly\nA new course cannot be recorded until a student enrols, because RegNo is part of the key and cannot be NULL.\n\n## 2. Update anomaly\nIf a faculty member changes phone number, every row of every course they teach must be updated. Missing one row leaves inconsistent data.\n\n## 3. Deletion anomaly\nIf the only student of a course drops it, deleting that row also deletes the course title and faculty details.\n\n## Cause\nRedundancy: facts about courses and faculty are repeated in every enrolment row. Technically, partial and transitive dependencies on the key.\n\n## Solution\nDecompose into STUDENT(RegNo, Name), COURSE(CourseCode, CourseTitle, FacultyId), FACULTY(FacultyId, Faculty, Phone) and ENROLMENT(RegNo, CourseCode). Each fact is stored once.\n\n## Conclusion\nAnomalies are the motivation for normalization; a normalized schema makes inserts, updates and deletes safe.',
    realWorld:
      "- **Hostel register in Excel:** the warden's number typed on every row; after a change, half the sheet shows the old number (update anomaly).\n- **Shop billing book:** product prices written on every bill line; a price change cannot be recorded until someone buys (insertion anomaly).\n- **WhatsApp-group contact lists:** delete the last message from a person and you lose their number (deletion anomaly).\n- **College alumni data:** when the last student of a batch is removed from the active table, the batch's placement records disappear with them.",
    flashcards: [
      ['What causes anomalies?', 'Redundant data: the same fact stored in many rows.'],
      ['Insertion anomaly?', 'A fact cannot be added without some other, unrelated fact.'],
      [
        'Update anomaly?',
        'One change must be made in many rows; missing one makes data inconsistent.',
      ],
      ['Deletion anomaly?', 'Deleting one fact unintentionally deletes another.'],
      [
        'How are anomalies removed?',
        'By normalization: decomposing relations so each fact is stored once.',
      ],
    ],
    mcqs: [
      {
        stem: 'The only student of a course leaves and the course title disappears. This is a(n)…',
        options: ['Insertion anomaly', 'Update anomaly', 'Deletion anomaly', 'Join anomaly'],
        correctIndex: 2,
        explanation: 'Deleting one fact removed another.',
        optionExplanations: [
          'Nothing is being inserted.',
          'No value is being changed.',
          'Correct.',
          'There is no such standard anomaly.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'The root cause of all three anomalies is…',
        options: ['Missing indexes', 'Redundancy', 'NULL values', 'Large tables'],
        correctIndex: 1,
        explanation: 'Repeated facts must be kept in sync and are tied to unrelated facts.',
        optionExplanations: [
          'Indexes affect speed.',
          'Correct.',
          'NULLs are a symptom in insertion anomalies, not the cause.',
          'Size alone causes no anomaly.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'A new course cannot be stored until a student enrols. Which anomaly?',
        options: ['Insertion', 'Update', 'Deletion', 'None'],
        correctIndex: 0,
        explanation: 'The key needs a student, so the course fact cannot be inserted alone.',
        optionExplanations: [
          'Correct.',
          'Nothing is being modified.',
          'Nothing is being removed.',
          'This is a classic anomaly.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which design removes the update anomaly for faculty phone numbers?',
        options: [
          'Store the phone in every course row',
          'Store the phone once in a FACULTY table',
          'Add an index on phone',
          'Make phone the primary key of COURSE',
        ],
        correctIndex: 1,
        explanation: 'Stored once, it is updated once.',
        optionExplanations: [
          'That is the problem.',
          'Correct.',
          'Indexes do not remove redundancy.',
          'Phone does not identify a course.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'Anomalies in a relation are a sign that it is NOT in…',
        options: [
          'A higher normal form such as 3NF/BCNF',
          'Any SQL database',
          'A sorted order',
          'A view',
        ],
        correctIndex: 0,
        explanation:
          'Partial and transitive dependencies cause them; higher normal forms remove them.',
        optionExplanations: [
          'Correct.',
          'Any database can hold a bad design.',
          'Order is irrelevant.',
          'Views are virtual tables.',
        ],
        difficulty: 'medium',
      },
    ],
    challenges: [
      {
        title: 'Size of the update anomaly',
        difficulty: 'easy',
        prompt:
          'Warden **Mr. Kumar** has a new phone number. Because the hostel register repeats his number, many rows need editing.\n\nReturn the number of rows that must be updated, as `rows_to_fix`.',
        setupSql: MESS,
        hiddenSql: MESS_HIDDEN,
        starterCode: 'SELECT count(*) AS rows_to_fix\nFROM mess_register\n-- filter here\n;',
        solution: "SELECT count(*) AS rows_to_fix FROM mess_register WHERE warden = 'Mr. Kumar';",
        orderMatters: false,
        hints: ["Filter with WHERE warden = 'Mr. Kumar'."],
      },
      {
        title: 'Fix it with one UPDATE',
        difficulty: 'medium',
        prompt:
          "Mr. Kumar's new number is **9445012345**. Write **one UPDATE statement** so that every row for him is consistent.\n\nYour code is checked by reading the table afterwards, so the result of your statement itself does not matter.",
        setupSql: MESS,
        hiddenSql: MESS_HIDDEN,
        starterCode: "UPDATE mess_register\nSET warden_phone = '…'\nWHERE …;",
        solution:
          "UPDATE mess_register SET warden_phone = '9445012345' WHERE warden = 'Mr. Kumar';",
        checkSql: 'SELECT reg_no, warden, warden_phone FROM mess_register ORDER BY reg_no;',
        orderMatters: true,
        hints: ['Change every row of the warden, not one reg_no.', "WHERE warden = 'Mr. Kumar'"],
      },
    ],
  },

  normalization: {
    video: {
      title: 'Learn Database Normalization - 1NF, 2NF, 3NF, 4NF, 5NF (Decomplexify)',
      url: 'https://www.youtube.com/watch?v=GFQaEYEc8_8',
    },
    // Existing demo content for Normalization lives in seed.js; only the additions are here.
    challenges: [
      {
        title: 'Decompose: pull out the department table',
        difficulty: 'medium',
        prompt:
          "`student_info` repeats each department's HOD on every student row.\n\nWrite the query that produces the new **DEPARTMENT(dept, hod)** relation: one row per department.",
        setupSql: `CREATE TABLE student_info (reg_no TEXT PRIMARY KEY, name TEXT, dept TEXT, hod TEXT);
INSERT INTO student_info VALUES
  ('23CS001', 'Aarthi', 'CSE', 'Dr. Meena R'), ('23CS002', 'Bharath', 'CSE', 'Dr. Meena R'),
  ('22EC007', 'Karthik', 'ECE', 'Dr. Senthil K'), ('24ME003', 'Lakshmi', 'MECH', 'Dr. Prakash V'),
  ('22ME011', 'Naveen', 'MECH', 'Dr. Prakash V');`,
        hiddenSql: `INSERT INTO student_info VALUES
  ('22EE002', 'Pooja', 'EEE', 'Dr. Usha N'), ('22CS014', 'Divya', 'CSE', 'Dr. Meena R');`,
        starterCode: 'SELECT …\nFROM student_info;',
        solution: 'SELECT DISTINCT dept, hod FROM student_info;',
        orderMatters: false,
        hints: ['Each department should appear once.', 'SELECT DISTINCT removes repeated rows.'],
      },
      {
        title: 'Lossless join: rebuild the report',
        difficulty: 'medium',
        prompt:
          'After normalization the data lives in `students` and `departments`. The office still wants the old report.\n\nReturn `reg_no`, `name`, `dept_name`, `hod` for every student, ordered by `reg_no`. A lossless decomposition must give back exactly the original rows.',
        setupSql: COLLEGE,
        hiddenSql: COLLEGE_HIDDEN,
        starterCode:
          'SELECT s.reg_no, s.name, d.dept_name, d.hod\nFROM students s\n-- join here\n;',
        solution:
          'SELECT s.reg_no, s.name, d.dept_name, d.hod FROM students s JOIN departments d ON d.dept_id = s.dept_id ORDER BY s.reg_no;',
        orderMatters: true,
        hints: ['Join on the common attribute dept_id.', 'Do not forget ORDER BY s.reg_no.'],
      },
    ],
  },

  nf123: {
    video: {
      title: '1st, 2nd and 3rd Normal Form (Database Normalisation)',
      url: 'https://www.youtube.com/watch?v=J-drts33N8g',
    },
    curiosity:
      'A student\'s record says Phone: "9840011111, 9840022222". The SMS system sends exam alerts only to the first number. What went wrong in the table design?',
    curiosityQuestion: {
      stem: 'Storing two phone numbers in one cell breaks which rule?',
      options: [
        'Every cell must be atomic (1NF)',
        'Every table needs an index',
        'Phone numbers must be unique',
      ],
      correctIndex: 0,
      explanation:
        '1NF requires one value per cell; repeating values go into separate rows or a separate table.',
    },
    easy: 'Normal forms are levels of good design. Each level fixes one kind of problem:\n\n1. **1NF:** one value per cell. No lists like "Maths, Physics" in one cell.\n2. **2NF:** 1NF + no **partial** dependency. With key (RegNo, Course), CourseTitle depends only on Course, so move it to a COURSE table.\n3. **3NF:** 2NF + no **transitive** dependency. RegNo → Dept → HOD: HOD depends on Dept, not directly on the student, so move it to a DEPT table.\n\nShortcut to remember: every non-key column must depend on **the key (1NF), the whole key (2NF), and nothing but the key (3NF)**.',
    tenMark:
      '## First Normal Form (1NF)\nA relation is in 1NF if every attribute holds atomic (indivisible) values and there are no repeating groups.\n*Fix:* put each value of a multi-valued attribute in its own row, or in a separate relation.\n\n## Second Normal Form (2NF)\nA relation is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on every candidate key (no partial dependency).\n*Example:* ENROL(RegNo, Course, Grade, CourseTitle) with key (RegNo, Course). Course → CourseTitle is partial.\n*Fix:* ENROL(RegNo, Course, Grade) and COURSE(Course, CourseTitle).\n\n## Third Normal Form (3NF)\nA relation is in 3NF if it is in 2NF and no non-prime attribute is transitively dependent on a candidate key. Formally, for every non-trivial X → A, X is a super key or A is a prime attribute.\n*Example:* STUDENT(RegNo, Name, Dept, HOD) with RegNo → Dept and Dept → HOD.\n*Fix:* STUDENT(RegNo, Name, Dept) and DEPT(Dept, HOD).\n\n## Summary table\n| Form | Removes |\n|---|---|\n| 1NF | Multi-valued / repeating groups |\n| 2NF | Partial dependencies |\n| 3NF | Transitive dependencies |\n\n## Properties of the decompositions\nBoth fixes are lossless (joining gives back the original) and dependency preserving.\n\n## Conclusion\n3NF removes most redundancy while preserving dependencies, which is why most practical schemas aim for it.',
    realWorld:
      '- **Online exam portal:** a student\'s subjects stored as "DBMS, OS, CN" in one cell cannot be counted or searched; a SUBJECT_REGISTRATION table (1NF) fixes it.\n- **Swiggy/Zomato menus:** restaurant address kept in the Restaurants table, not in every menu item row (2NF/3NF).\n- **College ERP:** course title and credits live in a COURSE table, not in every mark entry (2NF).\n- **Payroll:** employee → department → department location: the location is stored per department (3NF).',
    flashcards: [
      ['1NF rule?', 'Every cell holds a single atomic value; no repeating groups.'],
      ['2NF rule?', '1NF and no non-prime attribute depends on part of a candidate key.'],
      ['3NF rule?', '2NF and no non-prime attribute depends transitively on a key.'],
      [
        'Can a relation with a single-attribute key violate 2NF?',
        'No: partial dependency needs a composite key.',
      ],
      [
        '"The key, the whole key, and nothing but the key" stands for?',
        '1NF, 2NF and 3NF respectively.',
      ],
    ],
    mcqs: [
      {
        stem: 'A Phone attribute containing "9840011111, 9840022222" violates…',
        options: ['1NF', '2NF', '3NF', 'BCNF'],
        correctIndex: 0,
        explanation: 'The cell is not atomic.',
        optionExplanations: [
          'Correct.',
          '2NF assumes 1NF already holds.',
          '3NF assumes 2NF.',
          'BCNF assumes 3NF.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'ENROL(RegNo, Course, Grade, CourseTitle), key (RegNo, Course). The relation is in…',
        options: ['1NF but not 2NF', '2NF but not 3NF', '3NF', 'BCNF'],
        correctIndex: 0,
        explanation: 'Course → CourseTitle is a partial dependency.',
        optionExplanations: ['Correct.', 'It already fails 2NF.', 'It fails 2NF.', 'It fails 2NF.'],
        difficulty: 'medium',
      },
      {
        stem: 'STUDENT(RegNo, Name, Dept, HOD) with RegNo → Dept and Dept → HOD is in…',
        options: ['1NF only', '2NF but not 3NF', '3NF', 'Not even 1NF'],
        correctIndex: 1,
        explanation: 'The key is single-attribute (so 2NF holds) but HOD is transitive.',
        optionExplanations: [
          'It also satisfies 2NF.',
          'Correct.',
          'Dept → HOD is transitive.',
          'All values are atomic.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'To bring STUDENT(RegNo, Name, Dept, HOD) to 3NF you…',
        options: [
          'Remove HOD',
          'Split into STUDENT(RegNo, Name, Dept) and DEPT(Dept, HOD)',
          'Make (RegNo, Dept) the key',
          'Add an index on Dept',
        ],
        correctIndex: 1,
        explanation: 'Move the transitive dependency into its own relation.',
        optionExplanations: [
          'That loses data.',
          'Correct.',
          'That does not remove Dept → HOD.',
          'Indexes do not change normal form.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'A relation whose key has only one attribute and is in 1NF is automatically in…',
        options: ['2NF', '3NF', 'BCNF', '4NF'],
        correctIndex: 0,
        explanation: 'Partial dependency needs a composite key.',
        optionExplanations: [
          'Correct.',
          'Transitive dependencies may still exist.',
          'Not guaranteed.',
          'Not guaranteed.',
        ],
        difficulty: 'medium',
      },
    ],
    challenges: [
      {
        title: '1NF: one phone per row',
        difficulty: 'hard',
        prompt:
          '`contacts.phones` holds a comma-separated list, which breaks **1NF**.\n\nReturn one row per phone number: `reg_no` and `phone` (no spaces). Students with one number still appear once.',
        setupSql: `CREATE TABLE contacts (reg_no TEXT PRIMARY KEY, phones TEXT NOT NULL);
INSERT INTO contacts VALUES
  ('23CS001', '9840011111,9840022222'),
  ('23CS002', '9840033333'),
  ('22EC007', '9840044444, 9840055555, 9840066666');`,
        hiddenSql: `INSERT INTO contacts VALUES ('24ME003', '9840077777'), ('22ME011', '9840088888,9840099999');`,
        starterCode:
          "WITH RECURSIVE split(reg_no, phone, rest) AS (\n  SELECT reg_no, '', phones || ',' FROM contacts\n  UNION ALL\n  SELECT reg_no,\n         -- first value of rest,\n         -- rest after the first comma\n  FROM split WHERE rest <> ''\n)\nSELECT reg_no, trim(phone) AS phone FROM split WHERE phone <> '';",
        solution:
          "WITH RECURSIVE split(reg_no, phone, rest) AS (SELECT reg_no, '', phones || ',' FROM contacts UNION ALL SELECT reg_no, substr(rest, 1, instr(rest, ',') - 1), substr(rest, instr(rest, ',') + 1) FROM split WHERE rest <> '') SELECT reg_no, trim(phone) AS phone FROM split WHERE phone <> '';",
        orderMatters: false,
        hints: [
          "instr(rest, ',') finds the first comma.",
          "substr(rest, 1, instr(rest, ',') - 1) is the first number; substr(rest, instr(rest, ',') + 1) is the rest.",
          'trim() removes the spaces after commas.',
        ],
      },
      {
        title: '2NF: remove the partial dependency',
        difficulty: 'medium',
        prompt:
          '`marks_sheet` has key **(reg_no, course_code)**, but `course_title` and `credits` depend only on `course_code`: a partial dependency.\n\nProduce the new **COURSE(course_code, course_title, credits)** relation, one row per course.',
        setupSql: `CREATE TABLE marks_sheet (
  reg_no TEXT, course_code TEXT, marks INTEGER, course_title TEXT, credits INTEGER,
  PRIMARY KEY (reg_no, course_code)
);
INSERT INTO marks_sheet VALUES
  ('23CS001', 'CS T53', 82, 'Database Management Systems', 4),
  ('23CS002', 'CS T53', 67, 'Database Management Systems', 4),
  ('23CS001', 'CS T54', 74, 'Operating Systems', 3),
  ('23CS002', 'MA T51', 58, 'Discrete Mathematics', 4);`,
        hiddenSql: `INSERT INTO marks_sheet VALUES
  ('22CS014', 'CS T55', 91, 'Computer Networks', 3),
  ('22CS014', 'CS T53', 88, 'Database Management Systems', 4);`,
        starterCode: 'SELECT …\nFROM marks_sheet;',
        solution: 'SELECT DISTINCT course_code, course_title, credits FROM marks_sheet;',
        orderMatters: false,
        hints: [
          'Keep only the attributes that depend on course_code.',
          'Use DISTINCT to keep one row per course.',
        ],
      },
    ],
  },

  bcnf: {
    video: {
      title: 'Boyce-Codd Normal Form (BCNF) (Studytonight)',
      url: 'https://www.youtube.com/watch?v=NNjUhvvwOrk',
    },
    curiosity:
      'Each professor teaches exactly one subject, and a student takes each subject from one professor. The table (Student, Subject, Professor) is already in 3NF, yet the subject is repeated for every student of a professor. Is 3NF enough?',
    curiosityQuestion: {
      stem: 'In TEACH(Student, Subject, Professor) with Professor → Subject, what is still wrong?',
      options: [
        'Nothing; 3NF is always enough',
        'Professor decides Subject but Professor is not a key, so facts still repeat',
        'Student should be removed',
      ],
      correctIndex: 1,
      explanation:
        'BCNF requires every determinant to be a key. Professor is a determinant that is not a key.',
    },
    easy: '**BCNF** (Boyce-Codd Normal Form) is a stricter 3NF:\n\n> For every functional dependency X → Y, **X must be a super key**.\n\n3NF allowed one exception (Y may be part of a key). BCNF does not.\n\nExample: TEACH(Student, Subject, Professor), key (Student, Subject), and Professor → Subject. Professor is not a key, so split into **TEACHES(Professor, Subject)** and **ATTENDS(Student, Professor)**. Now each fact is stored once.',
    tenMark:
      '## Definition\nA relation R is in Boyce-Codd Normal Form if, for every non-trivial functional dependency X → Y in R, X is a super key of R.\n\n## BCNF vs 3NF\n- 3NF allows X → A when A is a prime attribute (part of some candidate key).\n- BCNF has no such exception, so every BCNF relation is in 3NF, but not every 3NF relation is in BCNF.\n- The difference appears with overlapping composite candidate keys.\n\n## Example\nTEACH(Student, Subject, Professor) with FDs:\n- (Student, Subject) → Professor\n- Professor → Subject (each professor teaches one subject)\nCandidate keys: (Student, Subject) and (Student, Professor). All attributes are prime, so TEACH is in 3NF. But Professor → Subject has a determinant that is not a super key, so it violates BCNF.\n\n## Decomposition algorithm\n1. Find an FD X → Y violating BCNF.\n2. Replace R by R1(X ∪ Y) and R2(R − Y).\n3. Repeat until every relation is in BCNF.\nResult: TEACHES(Professor, Subject) and ATTENDS(Student, Professor).\n\n## Properties\n- BCNF decomposition is always **lossless**.\n- It may **not preserve** every dependency (here (Student, Subject) → Professor cannot be checked in one table).\n\n## Conclusion\nBCNF removes all redundancy caused by functional dependencies; designers choose between BCNF and 3NF depending on whether dependency preservation matters more.',
    realWorld:
      '- **Lab allocation:** each lab assistant handles one lab; storing (Student, Lab, Assistant) repeats the lab for every student of that assistant.\n- **Hospital duty roster:** each doctor works in one ward; (Patient, Ward, Doctor) repeats the ward per patient. Splitting out (Doctor, Ward) is BCNF.\n- **Bus routes:** each driver drives one route; (Student, Route, Driver) in a college transport sheet repeats the route.\n- **Coaching centres:** each tutor teaches one batch subject; tutor → subject is stored once in a Tutors table.',
    flashcards: [
      ['BCNF rule?', 'For every non-trivial X → Y, X is a super key.'],
      ['Is every BCNF relation in 3NF?', 'Yes. The reverse is not always true.'],
      [
        'When can 3NF and BCNF differ?',
        'With overlapping composite candidate keys, where a prime attribute depends on a non-key.',
      ],
      ['Is BCNF decomposition lossless?', 'Yes, always lossless.'],
      [
        'What can BCNF decomposition lose?',
        'Dependency preservation: some FDs may span relations.',
      ],
    ],
    mcqs: [
      {
        stem: 'A relation is in BCNF if for every non-trivial X → Y…',
        options: ['Y is a prime attribute', 'X is a super key', 'X is a foreign key', 'Y is a key'],
        correctIndex: 1,
        explanation: 'Every determinant must be a super key.',
        optionExplanations: [
          'That is the 3NF exception.',
          'Correct.',
          'Foreign keys are unrelated.',
          'The dependent side is not the condition.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'TEACH(Student, Subject, Professor) with Professor → Subject is in 3NF but not BCNF because…',
        options: [
          'Subject is not atomic',
          'Professor is a determinant but not a super key',
          'It has a partial dependency',
          'It has no key',
        ],
        correctIndex: 1,
        explanation: 'Subject is prime, so 3NF allows it; BCNF does not.',
        optionExplanations: [
          'Values are atomic.',
          'Correct.',
          'All attributes are prime.',
          'It has two candidate keys.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'Which statement is TRUE?',
        options: [
          'Every 3NF relation is in BCNF',
          'Every BCNF relation is in 3NF',
          'BCNF allows transitive dependencies',
          'BCNF always preserves dependencies',
        ],
        correctIndex: 1,
        explanation: 'BCNF is strictly stronger than 3NF.',
        optionExplanations: [
          'Not always.',
          'Correct.',
          'It does not.',
          'It may lose some dependencies.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'BCNF decomposition is guaranteed to be…',
        options: [
          'Lossless only',
          'Dependency preserving only',
          'Both lossless and dependency preserving',
          'Neither',
        ],
        correctIndex: 0,
        explanation: 'It is always lossless but may not preserve dependencies.',
        optionExplanations: [
          'Correct.',
          'Dependency preservation is not guaranteed.',
          '3NF synthesis gives both; BCNF may not.',
          'It is always lossless.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'R(A, B) with A → B and B → A. R is in…',
        options: ['1NF only', '2NF only', '3NF only', 'BCNF'],
        correctIndex: 3,
        explanation: 'Both A and B are keys, so every determinant is a super key.',
        optionExplanations: [
          'It satisfies more.',
          'It satisfies more.',
          'It satisfies BCNF too.',
          'Correct.',
        ],
        difficulty: 'hard',
      },
    ],
    challenges: [
      {
        title: 'Find the BCNF violation',
        difficulty: 'medium',
        prompt:
          'In `teach(student, subject, professor)` the rule is **professor → subject**: each professor teaches one subject.\n\nReturn the decomposed relation **TEACHES(professor, subject)**, one row per professor.',
        setupSql: `CREATE TABLE teach (student TEXT, subject TEXT, professor TEXT, PRIMARY KEY (student, subject));
INSERT INTO teach VALUES
  ('Aarthi', 'DBMS', 'Dr. Ramesh'), ('Bharath', 'DBMS', 'Dr. Ramesh'),
  ('Divya', 'DBMS', 'Ms. Kavitha'), ('Aarthi', 'OS', 'Mr. Arun'),
  ('Bharath', 'OS', 'Mr. Arun');`,
        hiddenSql: `INSERT INTO teach VALUES
  ('Divya', 'CN', 'Dr. Leela'), ('Karthik', 'DBMS', 'Ms. Kavitha'), ('Karthik', 'OS', 'Mr. Arun');`,
        starterCode: 'SELECT …\nFROM teach;',
        solution: 'SELECT DISTINCT professor, subject FROM teach;',
        orderMatters: false,
        hints: [
          'The violating FD is professor → subject; its attributes form the new relation.',
          'Use DISTINCT.',
        ],
      },
      {
        title: 'Join the BCNF pieces back',
        difficulty: 'medium',
        prompt:
          'TEACH was decomposed into `teaches(professor, subject)` and `attends(student, professor)`.\n\nRebuild **(student, subject, professor)** by joining them, ordered by `student`, then `subject`. A lossless decomposition gives back exactly the original rows.',
        setupSql: `CREATE TABLE teaches (professor TEXT PRIMARY KEY, subject TEXT NOT NULL);
CREATE TABLE attends (student TEXT, professor TEXT, PRIMARY KEY (student, professor));
INSERT INTO teaches VALUES ('Dr. Ramesh', 'DBMS'), ('Ms. Kavitha', 'DBMS'), ('Mr. Arun', 'OS');
INSERT INTO attends VALUES
  ('Aarthi', 'Dr. Ramesh'), ('Bharath', 'Dr. Ramesh'), ('Divya', 'Ms. Kavitha'),
  ('Aarthi', 'Mr. Arun'), ('Bharath', 'Mr. Arun');`,
        hiddenSql: `INSERT INTO teaches VALUES ('Dr. Leela', 'CN');
INSERT INTO attends VALUES ('Divya', 'Dr. Leela'), ('Karthik', 'Mr. Arun');`,
        starterCode: 'SELECT a.student, t.subject, t.professor\nFROM attends a\n-- join here\n;',
        solution:
          'SELECT a.student, t.subject, t.professor FROM attends a JOIN teaches t ON t.professor = a.professor ORDER BY a.student, t.subject;',
        orderMatters: true,
        hints: ['The common attribute is professor.', 'ORDER BY a.student, t.subject'],
      },
    ],
  },

  indexing: {
    video: {
      title: 'B Trees and B+ Trees. How they are useful in Databases (Abdul Bari)',
      url: 'https://www.youtube.com/watch?v=aZjYr87r1b8',
    },
    curiosity:
      "The university has 2 lakh students' results. Searching for your register number takes 8 seconds. A textbook finds any topic in seconds using the index at the back. Can a database do the same?",
    curiosityQuestion: {
      stem: 'Why does an index make "find register number 23CS001" fast?',
      options: [
        'It compresses the table',
        'It keeps keys sorted in a tree, so the search skips most of the rows',
        'It stores the table in RAM',
      ],
      correctIndex: 1,
      explanation:
        'A B+ tree index reaches any key in a few node reads instead of scanning every row.',
    },
    easy: 'An **index** is like the index at the back of a textbook: a sorted list of keys with pointers to where the data is.\n\n- Without an index, the DBMS reads **every row** (a full table scan).\n- With a **B+ tree** index, it walks down a short, balanced tree: a few reads, even for millions of rows.\n- All data pointers sit in the **leaves**, which are linked left to right, so range queries like "marks between 60 and 75" are fast.\n\nCost: indexes take space and slow down inserts and updates a little, because the tree must be kept up to date. Index columns you search often.',
    tenMark:
      '## Definition\nAn index is an auxiliary data structure that speeds up retrieval of records by search-key values, at the cost of extra storage and update work.\n\n## Types of indexes\n1. **Primary index:** on the ordering key of a sorted file; usually sparse (one entry per block).\n2. **Clustering index:** on a non-key ordering field; one entry per distinct value.\n3. **Secondary index:** on a non-ordering field; dense (one entry per record).\n4. **Dense vs sparse:** dense has an entry for every record; sparse only for some.\n5. **Multilevel index:** an index on the index, reducing search to a few block reads.\n\n## B+ tree\n- A balanced multi-way search tree: every leaf is at the same depth.\n- Internal nodes hold only keys and child pointers; leaves hold keys with record pointers.\n- Leaves are linked, enabling fast range scans.\n- Each node except the root is at least half full; insertions split nodes and deletions merge them.\n- Search, insert and delete take O(log_n N) block accesses, where n is the fan-out.\n\n## Example\nWith fan-out 100, a 3-level B+ tree indexes up to about 10⁶ keys, so any search needs about 3 to 4 block reads instead of thousands.\n\n## Hash index\nDirect lookup by hashing the key: excellent for equality, useless for ranges.\n\n## Advantages and disadvantages\n+ Fast point and range queries, ordered access.\n− Extra storage; slower INSERT/UPDATE/DELETE.\n\n## Conclusion\nIndexes, especially B+ trees, are how databases answer queries quickly; choose them for frequently searched columns.',
    realWorld:
      '- **University results portal:** results are looked up by register number through an index; that is why the page loads fast even on result day.\n- **Google Maps / Swiggy:** spatial indexes find restaurants near you without checking every restaurant in India.\n- **Phone contacts app:** names are kept sorted (an index), so typing "Ra…" jumps straight to Ramesh.\n- **Banks:** account number and transaction date indexes let a statement for one month load instantly from billions of rows.',
    flashcards: [
      ['What is an index?', 'An extra sorted structure that speeds up searches by key.'],
      [
        'Dense vs sparse index?',
        'Dense: one entry per record. Sparse: entries for only some records (e.g. one per block).',
      ],
      ['Why are B+ tree leaves linked?', 'To scan ranges in order without going back up the tree.'],
      ['Cost of an index?', 'Extra storage and slower inserts, updates and deletes.'],
      ['Hash index weakness?', 'It cannot answer range queries.'],
    ],
    mcqs: [
      {
        stem: 'In a B+ tree, data (record) pointers are stored in…',
        options: ['The root only', 'Internal nodes only', 'Leaf nodes', 'Every node equally'],
        correctIndex: 2,
        explanation: 'Internal nodes guide the search; leaves hold the record pointers.',
        optionExplanations: [
          'The root is an internal node.',
          'Internal nodes hold only keys.',
          'Correct.',
          'That describes a B tree.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Which query does a hash index NOT help?',
        options: [
          "WHERE reg_no = '23CS001'",
          'WHERE marks BETWEEN 60 AND 75',
          'WHERE email = ?',
          'WHERE id = 10',
        ],
        correctIndex: 1,
        explanation: 'Hashing scatters keys, so ranges need a full scan.',
        optionExplanations: [
          'Equality is ideal for hashing.',
          'Correct.',
          'Equality again.',
          'Equality again.',
        ],
        difficulty: 'medium',
      },
      {
        stem: 'An index with one entry per data block is…',
        options: ['Dense', 'Sparse', 'Hash', 'Bitmap'],
        correctIndex: 1,
        explanation: 'Sparse indexes have entries for only some records.',
        optionExplanations: [
          'Dense has one entry per record.',
          'Correct.',
          'Hash is a different structure.',
          'Bitmap is a different structure.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'Why do indexes slow down INSERT statements?',
        options: [
          'They lock the table',
          'Each index must also be updated',
          'They compress data',
          'They disable caching',
        ],
        correctIndex: 1,
        explanation: 'Every insert adds an entry to every index on the table.',
        optionExplanations: [
          'Locking is not the main reason.',
          'Correct.',
          'Indexes do not compress.',
          'Caching is unaffected.',
        ],
        difficulty: 'easy',
      },
      {
        stem: 'A B+ tree has fan-out 100 and 3 levels. About how many keys can it index?',
        options: ['300', '10,000', '1,000,000', '100'],
        correctIndex: 2,
        explanation: '100 × 100 × 100 = 10⁶.',
        optionExplanations: [
          'Levels multiply, not add.',
          'That is two levels.',
          'Correct.',
          'That is one level.',
        ],
        difficulty: 'medium',
      },
    ],
    challenges: [
      {
        title: 'Index the register number',
        difficulty: 'easy',
        prompt:
          "The exam cell looks up `marks` by `reg_no` thousands of times on result day.\n\nWrite **one statement** that creates an index on `marks(reg_no)`. Any index name is fine. (Your index is checked by reading the database's own index list.)",
        setupSql: `CREATE TABLE marks (reg_no TEXT, course_code TEXT, mark INTEGER, PRIMARY KEY (course_code, reg_no));
INSERT INTO marks VALUES
  ('23CS001', 'CS T53', 82), ('23CS002', 'CS T53', 67), ('22CS014', 'CS T53', 91),
  ('23CS001', 'CS T54', 74), ('23CS002', 'CS T54', 59);`,
        hiddenSql: `INSERT INTO marks VALUES ('22EC007', 'EC T51', 70);`,
        starterCode: 'CREATE INDEX idx_marks_reg_no ON …;',
        solution: 'CREATE INDEX idx_marks_reg_no ON marks (reg_no);',
        checkSql:
          "SELECT EXISTS (SELECT 1 FROM pragma_index_list('marks') il JOIN pragma_index_info(il.name) ii WHERE ii.seqno = 0 AND ii.name = 'reg_no') AS has_index;",
        orderMatters: false,
        hints: ['CREATE INDEX <name> ON <table> (<column>);'],
      },
      {
        title: 'Range scan: marks between 60 and 75',
        difficulty: 'easy',
        prompt:
          'A B+ tree index on `mark` makes range queries fast because its leaves are sorted and linked.\n\nReturn `reg_no` and `mark` for every **CS T53** mark from **60 to 75** (inclusive), highest mark first; break ties by `reg_no`.',
        setupSql: `CREATE TABLE marks (reg_no TEXT, course_code TEXT, mark INTEGER, PRIMARY KEY (course_code, reg_no));
CREATE INDEX idx_marks_mark ON marks (course_code, mark);
INSERT INTO marks VALUES
  ('23CS001', 'CS T53', 72), ('23CS002', 'CS T53', 67), ('22CS014', 'CS T53', 91),
  ('22EC007', 'CS T53', 60), ('24ME003', 'CS T53', 58), ('23CS001', 'CS T54', 65);`,
        hiddenSql: `INSERT INTO marks VALUES ('22ME011', 'CS T53', 75), ('22EE002', 'CS T53', 76), ('25CS010', 'CS T53', 72);`,
        starterCode: 'SELECT reg_no, mark\nFROM marks\nWHERE …\nORDER BY …;',
        solution:
          "SELECT reg_no, mark FROM marks WHERE course_code = 'CS T53' AND mark BETWEEN 60 AND 75 ORDER BY mark DESC, reg_no;",
        orderMatters: true,
        hints: ['BETWEEN is inclusive on both ends.', 'ORDER BY mark DESC, reg_no'],
      },
    ],
  },
};

/** The DBMS subject's root page (seeded as published by the subject's faculty). */
export const DBMS_OVERVIEW = {
  tagline:
    'Design data so it stays correct, and find it fast — the skill behind every app you use.',
  why:
    'Every app you use — your college ERP, UPI, IRCTC, Swiggy — is a program wrapped around a database. ' +
    'This subject teaches you to **design** that data so it never contradicts itself, and to **find** it in milliseconds even when there are crores of rows. ' +
    'It is also one of the most asked subjects in placement interviews and GATE.',
  prerequisites: [
    {
      title: 'Sets, relations and functions (Discrete Mathematics)',
      why: 'A table is a relation, keys are functions, and functional dependencies are built on set ideas.',
    },
    {
      title: 'Data structures: trees and hashing',
      why: 'Indexes are B+ trees and hash tables; Unit 4 builds directly on them.',
    },
    {
      title: 'Basic programming',
      why: 'You will write SQL queries and read simple code that talks to a database.',
    },
  ],
  outcomes: [
    'Explain the relational model and identify every kind of key in a table.',
    'Find functional dependencies and spot insertion, update and deletion anomalies.',
    'Normalize a schema to 3NF and BCNF without losing data.',
    'Write SQL that queries, joins and checks real data.',
    'Choose an index that makes a slow query fast, and explain why.',
  ],
  applications: [
    {
      title: 'College ERP',
      description:
        'Students, courses and marks in separate, linked tables: one change updates every report.',
    },
    {
      title: 'Banking and UPI',
      description:
        'Keys and constraints keep every rupee accounted for, even with millions of transfers a day.',
    },
    {
      title: 'IRCTC and booking apps',
      description: 'Indexes find your PNR among crores of bookings in a fraction of a second.',
    },
    {
      title: 'Data analytics',
      description: 'Clean, normalized data is what makes reports and dashboards trustworthy.',
    },
  ],
  careers: [
    'Backend developer',
    'Database administrator (DBA)',
    'Data analyst',
    'Data engineer',
    'Full-stack developer',
  ],
  units: {
    3: {
      summary:
        'How to design relational tables: keys, functional dependencies, the anomalies that bad design causes, and normalization up to BCNF.',
      youWillBeAbleTo:
        'Take a messy spreadsheet and turn it into clean, linked tables in 3NF or BCNF.',
      leadsTo:
        'Once your tables are well designed, the next question is speed: Unit 4 shows how the database finds rows fast.',
    },
    4: {
      summary:
        'How data is stored on disk and how indexes (B+ trees, hashing) make lookups and range queries fast.',
      youWillBeAbleTo: 'Pick the right index for a query and explain how a B+ tree search works.',
      leadsTo: '',
    },
  },
};
