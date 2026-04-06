type AuthIdentity = {
  tokenIdentifier: string;
  subject: string;
};

export function getAuthUserIds(identity: AuthIdentity) {
  return identity.subject && identity.subject !== identity.tokenIdentifier
    ? [identity.tokenIdentifier, identity.subject]
    : [identity.tokenIdentifier];
}

export function ownsUserData(userId: string, identity: AuthIdentity) {
  return getAuthUserIds(identity).includes(userId);
}
