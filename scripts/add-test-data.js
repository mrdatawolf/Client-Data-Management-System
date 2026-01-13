const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Sample data for generating realistic test data
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Edward', 'Deborah', 'Ronald', 'Stephanie'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts'
];

const departments = ['Office', 'Sales', 'IT', 'Accounting', 'HR', 'Operations', 'Management', 'Support'];
const descriptions = ['Desktop PC', 'Laptop', 'Workstation', 'Manager Laptop', 'Sales Laptop', 'IT Workstation'];
const cpuModels = [
  'Intel i5-10400', 'Intel i7-10700', 'Intel i5-11400', 'Intel i7-11700',
  'Intel i9-10900', 'AMD Ryzen 5 5600X', 'AMD Ryzen 7 5800X', 'Intel i5-12400'
];

function generateIP() {
  return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
}

function generateServiceTag() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tag = '';
  for (let i = 0; i < 7; i++) {
    tag += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return tag;
}

function generatePhone() {
  return `(707) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate test data
const workstations = [];
const users = [];

for (let i = 1; i <= 50; i++) {
  const computerName = `BT-PC-${String(i).padStart(3, '0')}`;
  const firstName = randomChoice(firstNames);
  const lastName = randomChoice(lastNames);
  const department = randomChoice(departments);
  const description = randomChoice(descriptions);
  const cpu = randomChoice(cpuModels);
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;

  // Workstation data
  const workstation = {
    'Client': 'BT',
    'Computer Name': computerName,
    'IP Address': generateIP(),
    'Service Tag': generateServiceTag(),
    'Description': description,
    'Upstream': '192.168.1.1',
    'Notes': i % 3 === 0 ? 'Needs software update' : '',
    'Notes 2': '',
    'On Landing Page': i <= 5 ? 1 : 0, // First 5 are featured
    'Active': Math.random() > 0.1 ? 1 : 0, // 90% active
    'Grouping': description.includes('Laptop') ? 'Laptops' : 'Desktops',
    'Asset ID': `BT-AST-${String(i).padStart(4, '0')}`,
    'CPU': cpu,
    'Win11 Capable': cpu.includes('i5-12') || cpu.includes('i7-11') || cpu.includes('i9') || cpu.includes('Ryzen') ? 1 : 0
  };

  // User data
  const user = {
    'Client': 'BT',
    'SubName': department,
    'Computer Name': computerName,
    'Name': `${firstName} ${lastName}`,
    'Login': username,
    'Password': `Pass${Math.floor(Math.random() * 9000) + 1000}!`,
    'Phone': generatePhone(),
    'Cell': generatePhone(),
    'Notes': i % 5 === 0 ? 'Remote worker' : '',
    'Notes 2': '',
    'Epicor Number': `E${String(i + 12345).padStart(6, '0')}`,
    'Active': workstation.Active, // Match workstation active status
    'Grouping': department
  };

  workstations.push(workstation);
  users.push(user);
}

// Read existing files and append data
const examplesDir = path.join(__dirname, '..', 'Examples');

// Process Workstations.xlsx
const workstationsPath = path.join(examplesDir, 'Workstations.xlsx');
if (fs.existsSync(workstationsPath)) {
  const workbook = XLSX.readFile(workstationsPath);
  const sheetName = 'Workstations';

  if (workbook.SheetNames.includes(sheetName)) {
    const worksheet = workbook.Sheets[sheetName];
    const existingData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Workstations.xlsx: Found ${existingData.length} existing rows`);

    // Append new data
    const allData = [...existingData, ...workstations];
    const newWorksheet = XLSX.utils.json_to_sheet(allData);
    workbook.Sheets[sheetName] = newWorksheet;

    // Write back
    XLSX.writeFile(workbook, workstationsPath);
    console.log(`✓ Added 50 test workstations. Total: ${allData.length} rows`);
  } else {
    console.error(`Sheet "${sheetName}" not found in Workstations.xlsx`);
  }
} else {
  console.error('Workstations.xlsx not found');
}

// Process Users.xlsx
const usersPath = path.join(examplesDir, 'Users.xlsx');
if (fs.existsSync(usersPath)) {
  const workbook = XLSX.readFile(usersPath);
  const sheetName = 'Users';

  if (workbook.SheetNames.includes(sheetName)) {
    const worksheet = workbook.Sheets[sheetName];
    const existingData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Users.xlsx: Found ${existingData.length} existing rows`);

    // Append new data
    const allData = [...existingData, ...users];
    const newWorksheet = XLSX.utils.json_to_sheet(allData);
    workbook.Sheets[sheetName] = newWorksheet;

    // Write back
    XLSX.writeFile(workbook, usersPath);
    console.log(`✓ Added 50 test users. Total: ${allData.length} rows`);
  } else {
    console.error(`Sheet "${sheetName}" not found in Users.xlsx`);
  }
} else {
  console.error('Users.xlsx not found');
}

console.log('\n✓ Test data generation complete!');
console.log('  - All records use Client: BT');
console.log('  - Computer Names: BT-PC-001 through BT-PC-050');
console.log('  - Users are linked to workstations via Computer Name');
