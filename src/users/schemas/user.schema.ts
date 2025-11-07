import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';
import type { UserRole } from '../../common/enums';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ trim: true, lowercase: true, index: true, unique: true, required: true })
  email: string;

  @Prop({ trim: true })
  username?: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: String, enum: ['student', 'teacher', 'admin'], default: 'student', index: true })
  role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);

// hash password on save if modified
UserSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// helper method (optional)
UserSchema.methods.comparePassword = async function (plain: string) {
  return bcrypt.compare(plain, this.password);
};
