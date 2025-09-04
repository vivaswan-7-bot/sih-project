const ALLOWED_EVENTS = ['flood','tsunami','cyclone','high_waves','other'];

function validateNewPost(body) {
  const errors = [];
  if (!body.title) errors.push('title required');
  if (!body.eventType) errors.push('eventType required');
  if (body.eventType && !ALLOWED_EVENTS.includes(body.eventType)) {
    errors.push(`eventType must be one of: ${ALLOWED_EVENTS.join(', ')}`);
  }
  // latitude/longitude are optional in MVP, but if present they must be numbers
  if (body.latitude !== undefined && typeof body.latitude !== 'number') errors.push('latitude must be number');
  if (body.longitude !== undefined && typeof body.longitude !== 'number') errors.push('longitude must be number');
  return errors;
}

module.exports = { ALLOWED_EVENTS, validateNewPost };
