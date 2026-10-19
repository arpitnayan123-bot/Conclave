// Shared types for the private member platform (mirror of API payloads)

export type IdeaAuthor = {
  id: string;
  name: string;
  college: string;
  gradYear: string;
  roles: string;
  skills: string;
};

export type InterestRow = {
  id: string;
  message: string;
  member: { id: string; name: string; college: string };
};

export type Idea = {
  id: string;
  title: string;
  pitch: string;
  stage: string;
  needs: string;
  tags: string;
  createdAt: string;
  author: IdeaAuthor;
  interests: InterestRow[];
  commentCount?: number;
  bookmarked?: boolean;
};

export type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  memberId: string;
  member: { id: string; name: string; college: string; roles: string };
};

export type IdeasPayload = {
  ideas: Idea[];
  meId: string;
  /** windowed feed — present when the API paginates */
  total?: number;
  hasMore?: boolean;
};

export type DirectoryMember = {
  id: string;
  name: string;
  // null unless already introduced (ACCEPTED) — the API keeps it private otherwise
  email: string | null;
  college: string;
  gradYear: string;
  bio: string;
  skills: string;
  roles: string;
  availableFor: string;
  ideaCount: number;
  ideaTitles: { id: string; title: string; stage: string }[];
  // directional: "PENDING_IN" = they asked me (accept in place),
  // "PENDING_OUT" = I asked them, "ACCEPTED" = introduced, null = unacquainted
  connectionStatus: string | null;
  connectionId: string | null;
};

export type MemberBrief = {
  id: string;
  name: string;
  college: string;
  roles: string;
  skills: string;
  gradYear: string;
};

export type ConnectionRow = {
  id: string;
  status: string;
  message: string;
  createdAt: string;
  requesterId: string;
  addresseeId: string;
  other: MemberBrief;
};

export type ConnectionsPayload = {
  incoming: ConnectionRow[];
  outgoing: ConnectionRow[];
  accepted: ConnectionRow[];
};

export type TabKey = "feed" | "saved" | "directory" | "myideas" | "requests" | "profile";
