#!/usr/bin/env node
/**
 * zoho-setup.js — One-time Zoho Self-Client Grant Code Exchange
 *
 * PURPOSE:
 *   Exchange a Zoho Self-Client temporary grant code for a permanent refresh_token.
 *   Persists refresh_token directly into .env so the runtime OAuth manager
 *   uses it automatically from that point onwards with no manual steps.
 *
 * USAGE:
 *   1. Go to https://api-console.zoho.in → Your Self Client → Generate Code
 *      Scope: ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.users.ALL
 *      Time Duration: 10 minutes
 *      Select Organization: (Must select your active CRM Organization in the pop-up modal!)
 *   2. Run: node scripts/zoho-setup.js <GRANT_CODE>
 *      Example: node scripts/zoho-setup.js 1000.abc123...def456
 */

'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const CLIENT_ID     = (process.env.ZOHO_CRM_CLIENT_ID || '').trim();
const CLIENT_SECRET = (process.env.ZOHO_CRM_CLIENT_SECRET || '').trim();
const ACCOUNTS_URL  = (process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in').trim();
const API_DOMAIN    = (process.env.ZOHO_CRM_API_DOMAIN || 'https://www.zohoapis.in').trim();

function validate() {
  const missing = [];
  if (!CLIENT_ID)     missing.push('ZOHO_CRM_CLIENT_ID');
  if (!CLIENT_SECRET) missing.push('ZOHO_CRM_CLIENT_SECRET');
  if (missing.length) {
    console.error('\n❌  Missing required .env variables:', missing.join(', '));
    process.exitCode = 1;
    return false;
  }
  return true;
}

function writeEnvKey(key, value) {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const regex = new RegExp(`^${key}=.*`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
  console.log(`  ✓  Wrote ${key} to .env`);
}

async function exchangeGrantCode(grantCode) {
  const rawCode = (grantCode || '').trim();
  const tokenUrl = `${ACCOUNTS_URL}/oauth/v2/token`;
  console.log('\n[1/3] Exchanging grant code with Zoho India OAuth...');
  console.log('      Endpoint:', tokenUrl);
  console.log('      Client ID:', CLIENT_ID);

  const bodyParams = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: rawCode
  });

  if (process.env.ZOHO_CRM_REDIRECT_URI) {
    bodyParams.append('redirect_uri', process.env.ZOHO_CRM_REDIRECT_URI.trim());
  }

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams.toString()
  });

  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch {
    console.error('❌  Non-JSON response from Zoho:', raw);
    process.exitCode = 1;
    return null;
  }

  if (data.error) {
    console.error('\n❌  Zoho OAuth Error:', data.error);
    if (data.error === 'invalid_code') {
      console.error('    Possible causes:');
      console.error('    1. Grant code expired (valid for 3-10 minutes only)');
      console.error('    2. Grant code already used / single-use exhausted');
      console.error('    3. Grant code was generated under a different Client ID');
    } else if (data.error === 'invalid_client') {
      console.error('    Possible causes:');
      console.error('    1. ZOHO_CRM_CLIENT_ID or ZOHO_CRM_CLIENT_SECRET mismatch');
      console.error('    2. Wrong data center (.com vs .in)');
    }
    process.exitCode = 1;
    return null;
  }

  if (!data.access_token || !data.refresh_token) {
    console.error('❌  Unexpected response — missing tokens:', JSON.stringify(data, null, 2));
    process.exitCode = 1;
    return null;
  }

  return data;
}

async function verifyCrmConnection(accessToken) {
  console.log('\n[3/3] Verifying with read-only CRM request (GET /crm/v3/org)...');
  const url = `${API_DOMAIN}/crm/v3/org`;
  console.log('      GET', url);

  const res = await fetch(url, {
    headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
  });
  const raw = await res.text();
  console.log('      HTTP Status:', res.status, res.statusText);

  let data;
  try { data = JSON.parse(raw); } catch { data = null; }

  if (res.status === 200 && data?.org?.length) {
    const org = data.org[0];
    console.log('\n✅  ZOHO CRM CONNECTED SUCCESSFULLY');
    console.log('──────────────────────────────────────');
    console.log('  Organization  :', org.company_name);
    console.log('  Primary Email :', org.primary_email);
    console.log('  Country       :', org.country);
    console.log('  Timezone      :', org.time_zone);
    console.log('  Currency      :', org.currency_symbol || org.currency_locale);
    console.log('  CRM Edition   :', org.edition || org.plan || 'Unknown');
    console.log('──────────────────────────────────────');

    console.log('\n      Testing Leads read-only (per_page=1)...');
    const leadRes = await fetch(`${API_DOMAIN}/crm/v3/Leads?per_page=1`, {
      headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
    });
    if (leadRes.status === 204) {
      console.log('      Leads module: ✓ Accessible (0 records)');
    } else if (leadRes.status === 200) {
      const lData = await leadRes.json();
      console.log('      Leads module: ✓ Accessible,', lData.data?.length || 0, 'record(s) returned');
    } else {
      console.log('      Leads module: HTTP', leadRes.status, await leadRes.text());
    }
  } else {
    console.error('\n❌  CRM API request failed');
    console.error('    HTTP Status:', res.status);
    console.error('    Response   :', raw.substring(0, 500));
    process.exitCode = 1;
  }
}

async function main() {
  const grantCode = process.argv[2];
  if (!validate()) return;

  if (!grantCode) {
    const existingRefreshToken = (process.env.ZOHO_CRM_REFRESH_TOKEN || '').trim();
    if (existingRefreshToken) {
      console.log('\nTesting existing ZOHO_CRM_REFRESH_TOKEN...');
      const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'refresh_token',
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: existingRefreshToken
        }).toString()
      });
      const data = await res.json();
      if (data.access_token) {
        console.log('✓  Stored refresh token is valid!');
        await verifyCrmConnection(data.access_token);
        return;
      }
      console.log('  Stored refresh token response:', JSON.stringify(data));
    }
    process.exitCode = 1;
    return;
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  RichenQuest — Zoho CRM OAuth Initial Setup  ');
  console.log('═══════════════════════════════════════════════');

  const tokens = await exchangeGrantCode(grantCode);
  if (!tokens) return;

  console.log('\n[2/3] Persisting permanent refresh_token to .env...');
  writeEnvKey('ZOHO_CRM_REFRESH_TOKEN', tokens.refresh_token);

  await verifyCrmConnection(tokens.access_token);

  console.log('\n✓  Setup complete. Runtime will auto-refresh access tokens.');
  console.log('   No manual token generation required from this point forward.\n');
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err.message);
  process.exitCode = 1;
});
