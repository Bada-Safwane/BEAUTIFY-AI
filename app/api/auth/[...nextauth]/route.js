import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        let client;
        try {
          client = new MongoClient(uri);
          await client.connect();

          const database = client.db('GeminiDB');
          const users = database.collection('users');
          const pendingCredits = database.collection('pendingCredits');
          const pictures = database.collection('pictures');

          // Check if user exists
          let existingUser = await users.findOne({ email: user.email });

          if (!existingUser) {
            // Check for pending credits
            const pendingCredit = await pendingCredits.findOne({
              email: user.email,
              claimed: false,
              expiresAt: { $gt: new Date() }
            });

            const initialCredits = pendingCredit ? pendingCredit.credits : 0;

            // Create new user
            const result = await users.insertOne({
              username: user.name || user.email.split('@')[0],
              email: user.email,
              googleId: profile.sub,
              credits: initialCredits,
              createdAt: new Date(),
              updatedAt: new Date()
            });

            // Mark pending credits as claimed and save pending image if exists
            if (pendingCredit) {
              await pendingCredits.updateOne(
                { _id: pendingCredit._id },
                { 
                  $set: { 
                    claimed: true, 
                    claimedAt: new Date(),
                    userId: result.insertedId.toString()
                  } 
                }
              );

              // Save pending image if it exists
              if (pendingCredit.imageUrl && pendingCredit.imageUrl !== '') {
                await pictures.insertOne({
                  email: user.email,
                  userId: result.insertedId.toString(),
                  username: user.name || user.email.split('@')[0],
                  image: pendingCredit.imageUrl,
                  plan: pendingCredit.plan,
                  createdAt: new Date()
                });
              }
            }
          }

          return `/api/auth/google-callback?email=${encodeURIComponent(user.email)}`;
        } catch (error) {
          console.error('Google sign in error:', error);
          return false;
        } finally {
          if (client) {
            await client.close();
          }
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user?.email) {
        let client;
        try {
          client = new MongoClient(uri);
          await client.connect();

          const database = client.db('GeminiDB');
          const users = database.collection('users');

          const user = await users.findOne({ email: session.user.email });
          
          if (user) {
            session.user.id = user._id.toString();
            session.user.credits = user.credits;
            session.user.username = user.username;
          }
        } catch (error) {
          console.error('Session error:', error);
        } finally {
          if (client) {
            await client.close();
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
