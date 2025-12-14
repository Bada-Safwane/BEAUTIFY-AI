import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

const uri = process.env.MONGODB_URI;
const SECRET = process.env.SECRET;

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

          return true;
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
    async redirect({ url, baseUrl }) {
      // Redirect to home page after sign in
      return baseUrl;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user) {
        let client;
        try {
          client = new MongoClient(uri);
          await client.connect();

          const database = client.db('GeminiDB');
          const users = database.collection('users');

          const dbUser = await users.findOne({ email: user.email });
          
          if (dbUser) {
            // Generate our custom JWT token
            const customToken = jwt.sign(
              { userId: dbUser._id.toString(), username: dbUser.username, email: dbUser.email },
              SECRET,
              { expiresIn: '7d' }
            );
            
            token.customToken = customToken;
            token.userId = dbUser._id.toString();
            token.credits = dbUser.credits;
            token.username = dbUser.username;
          }
        } catch (error) {
          console.error('JWT callback error:', error);
        } finally {
          if (client) {
            await client.close();
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.customToken) {
        session.customToken = token.customToken;
        session.user.id = token.userId;
        session.user.credits = token.credits;
        session.user.username = token.username;
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
