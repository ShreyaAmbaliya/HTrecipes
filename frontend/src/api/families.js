/**
 * Family API helpers. All calls use Authorization: Bearer ${token}.
 */
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;

function headers(token, json = false) {
  const h = { Authorization: `Bearer ${token}` };
  if (json) h["Content-Type"] = "application/json";
  return { headers: h };
}

/** POST /api/families — Create family. Body: { name, description? }. Returns family (id, invite_code, ...). */
export async function createFamily(token, { name, description }) {
  const { data } = await axios.post(
    `${API}/families`,
    { name: name?.trim(), description: description?.trim() || null },
    headers(token, true)
  );
  return data;
}

/** POST /api/families/join — Join by invite code. Body: { invite_code }. Returns family. */
export async function joinFamily(token, { invite_code }) {
  const { data } = await axios.post(
    `${API}/families/join`,
    { invite_code: invite_code?.trim() },
    headers(token, true)
  );
  return data;
}

/** GET /api/families/{id} — Get family details (name, description, invite_code, ...). */
export async function getFamily(token, familyId) {
  const { data } = await axios.get(`${API}/families/${familyId}`, headers(token));
  return data;
}

/** PUT /api/families/{id} — Update family (Keeper only). Body: { name?, description?, cover_image? }. */
export async function updateFamily(token, familyId, { name, description, cover_image }) {
  const { data } = await axios.put(
    `${API}/families/${familyId}`,
    { name: name?.trim(), description: description?.trim(), cover_image: cover_image ?? undefined },
    headers(token, true)
  );
  return data;
}

/** DELETE /api/families/{id} — Delete family (Keeper only). */
export async function deleteFamily(token, familyId) {
  await axios.delete(`${API}/families/${familyId}`, headers(token));
}

/** GET /api/families/{id}/members — List members. Returns array of { id, name, email, nickname, role, ... }. */
export async function getFamilyMembers(token, familyId) {
  const { data } = await axios.get(`${API}/families/${familyId}/members`, headers(token));
  return data;
}

/** DELETE /api/families/{id}/members/{userId} — Remove member (Keeper only). */
export async function removeMember(token, familyId, userId) {
  await axios.delete(`${API}/families/${familyId}/members/${userId}`, headers(token));
}

/** DELETE /api/families/{id}/leave — Leave family. */
export async function leaveFamily(token, familyId) {
  await axios.delete(`${API}/families/${familyId}/leave`, headers(token));
}

/** PUT /api/families/{id}/transfer-keeper — Transfer Keeper role. Body: { new_keeper_id }. */
export async function transferKeeper(token, familyId, { new_keeper_id }) {
  const { data } = await axios.put(
    `${API}/families/${familyId}/transfer-keeper`,
    { new_keeper_id },
    headers(token, true)
  );
  return data;
}
