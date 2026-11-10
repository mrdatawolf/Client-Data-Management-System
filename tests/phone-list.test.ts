/** TASK-006: client phone list route. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/data/phone-list/route";

const get = (client?: string) =>
  GET(
    new NextRequest(
      `http://localhost/api/data/phone-list${client === undefined ? "" : `?client=${encodeURIComponent(client)}`}`,
    ),
  );

async function writeFixture(file: string, withPlaceholderRow: boolean) {
  const wb = new ExcelJS.Workbook();
  const users = wb.addWorksheet("Users");
  if (withPlaceholderRow) users.addRow(["%MailboxID%", "%FirstName%", "%LastName%"]);
  users.addRow([
    "Mailbox ID", "First Name", "Last Name", "Extension", "Email", "Mobile Phone",
    "Department", "Job Title", "Site", "Direct Number (DID)", "Status", "Unread Messages",
  ]);
  users.addRow([
    "1", "Barbara", "Walker", "5102",
    { text: "barbara@example.com", hyperlink: "mailto:barbara@example.com" },
    null, "Office", "Manager", "Main", "(256) 987-5087", "Enabled", "4",
  ]);
  users.addRow([]);
  const queues = wb.addWorksheet("Call Queues");
  queues.addRow(["Mailbox ID", "First Name", "Last Name", "Extension", "Assigned Call Queues"]);
  queues.addRow(["1", "Barbara", "Walker", "5102", "Main HG (Ext. 8006)"]);
  await wb.xlsx.writeFile(file);
}

test("phone list route", async (t) => {
  const original = process.env.PHONE_LIST;
  const dir = mkdtempSync(join(tmpdir(), "cdms phone-"));
  t.after(() => {
    if (original === undefined) delete process.env.PHONE_LIST;
    else process.env.PHONE_LIST = original;
    rmSync(dir, { recursive: true, force: true });
  });
  process.env.PHONE_LIST = dir;
  await writeFixture(join(dir, "GLC.xlsx"), false);
  await writeFixture(join(dir, "NFL.xlsx"), true);

  await t.test("returns mapped users and call queues", async () => {
    for (const client of ["GLC", "NFL"]) {
      const res = await get(client);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.available, true);
      assert.deepEqual(body.users, [
        {
          Name: "Barbara Walker",
          Extension: "5102",
          "Direct Number (DID)": "(256) 987-5087",
          "Mobile Phone": "",
          Email: "barbara@example.com",
          Department: "Office",
          "Job Title": "Manager",
          Site: "Main",
          Status: "Enabled",
        },
      ]);
      assert.deepEqual(body.callQueues, [
        {
          "Mailbox ID": "1",
          "First Name": "Barbara",
          "Last Name": "Walker",
          Extension: "5102",
          "Assigned Call Queues": "Main HG (Ext. 8006)",
        },
      ]);
    }
  });

  await t.test("missing file is not an error", async () => {
    const res = await get("XYZ");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { available: false });
  });

  await t.test("rejects path traversal and bad input", async () => {
    writeFileSync(join(dir, "..", "x.xlsx"), "not read");
    t.after(() => rmSync(join(dir, "..", "x.xlsx"), { force: true }));
    for (const client of ["../x", "..", "a/b", "a\\b", "GLC.xlsx", ""]) {
      const res = await get(client);
      assert.equal(res.status, 400, client);
    }
    assert.equal((await get()).status, 400);
  });

  await t.test("unset PHONE_LIST is a clear error", async () => {
    delete process.env.PHONE_LIST;
    const res = await get("GLC");
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: "PHONE_LIST is not configured" });
    process.env.PHONE_LIST = dir;
  });
});
