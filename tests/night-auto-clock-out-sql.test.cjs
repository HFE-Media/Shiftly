const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const fix = fs.readFileSync('supabase/migrations/20260925100000_fix_overnight_attendance.sql', 'utf8');
const normal = fs.readFileSync('supabase/migrations/20260804100000_tr_electrical_daily_auto_clock_out.sql', 'utf8');
const night = fs.readFileSync('supabase/migrations/20260806100000_mck_power_night_auto_clock_out.sql', 'utf8');

const normalMayClaim = (clockInMinutes, nightEnabled, nightStartMinutes) => (
  !(nightEnabled && clockInMinutes >= nightStartMinutes)
);

test('normal auto-clock-out excludes the inclusive configured night window', () => {
  assert.equal(normalMayClaim(16 * 60 + 29, true, 16 * 60 + 30), true);
  assert.equal(normalMayClaim(16 * 60 + 30, true, 16 * 60 + 30), false);
  assert.equal(normalMayClaim(16 * 60 + 59, true, 16 * 60 + 30), false);
  assert.equal(normalMayClaim(17 * 60 + 3, true, 16 * 60 + 30), false);
  assert.match(fix, /v_rule\.night_shift_enabled[\s\S]*v_source_local_time >= v_rule\.night_shift_start_time[\s\S]*continue;/);
});

test('night processor includes the exact configured start boundary in company local time', () => {
  assert.match(fix, /v_source_local_time < v_rule\.night_shift_start_time/);
  assert.doesNotMatch(fix, /v_new := '      if v_source_local_time <= v_rule\.night_shift_start_time/);
  assert.match(night, /v_candidate\.source_created_at at time zone v_rule\.timezone/);
});

test('manual successful OUT prevents either processor from creating a duplicate automatic OUT', () => {
  for (const source of [normal, night]) {
    assert.match(source, /event\.result = 'OK'/);
    assert.match(source, /order by event\.created_at desc, event\.entry_id desc[\s\S]*limit 1/);
    assert.match(source, /latest\.action = 'IN'/);
  }
});

test('migration preserves fail-closed replacement and processor privileges', () => {
  assert.match(fix, /Expected normal automatic clock-out definition was not found/);
  assert.match(fix, /Expected night automatic clock-out boundary was not found/);
  assert.match(fix, /revoke all on function public\.process_company_auto_clock_outs/);
  assert.match(fix, /revoke all on function public\.process_company_night_auto_clock_outs/);
});
