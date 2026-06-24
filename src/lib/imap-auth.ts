import { ImapFlow } from 'imapflow';

export async function verifyImapCredentials(host: string, port: number, secure: boolean, user: string, pass: string): Promise<boolean> {
  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    logger: false
  });

  try {
    await client.connect();
    await client.logout();
    return true;
  } catch (error) {
    console.error("IMAP Auth Error:", error);
    return false;
  }
}
