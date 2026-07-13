export interface Team {
  id: string;
  name: string;
  player1: string;
  player2: string;
  player1Id?: string;
  player2Id?: string;
  level: 'Beginner' | 'Bronze' | 'Silver' | 'Gold';
  phone: string;
  email: string;
  phone2?: string;
  email2?: string;
  registeredAt: string;
  group?: string; // e.g. "Girone A", "Girone B" for pool play
  
  // Stats dynamically computed or persisted for standings
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  points: number; // General tournament ranking points

  // Fields to support team substitution while preserving chronological links
  isWithdrawn?: boolean;
  withdrawnAt?: string;
  replacedByTeamId?: string;
  replacedByTeamName?: string;
  subenteredForTeamId?: string;
  subenteredForTeamName?: string;
}

export interface SetScore {
  team1: number;
  team2: number;
}

export interface Match {
  id: string;
  round: number; // 1 = Ottavi (16) / Turno 1, 2 = Quarti (8) / Turno 2, 3 = Semifinali (4) / Turno 3, 4 = Finale (2) / Turno 4
  roundLabel: string;
  position: number; // Vertical sorting in the round brackets
  team1: Team | null; // null represents TBD (to be decided) from previous round
  team2: Team | null;
  team1Score: number; // Sets won
  team2Score: number; // Sets won
  sets: SetScore[]; // Detailed points, e.g., [{team1: 21, team2: 18}, {team1: 19, team2: 21}, {team1: 15, team2: 12}]
  status: 'scheduled' | 'live' | 'completed';
  court: string;
  time: string; // Match schedule time (e.g. "14:30")
  winnerId?: string;
  nextMatchId?: string; // Target match standard for single-elimination routing
  nextMatchSlot?: 'team1' | 'team2'; // Which slot the winner will occupy in the next match
  loserMatchId?: string; // Target match for the loser (e.g., in Winner-Loser tournament)
  loserMatchSlot?: 'team1' | 'team2'; // Which slot the loser will occupy in the target match
  livePointTicker?: string; // Last live commentary or event (e.g. "Ace di Rossi! 14-12")
  liveT1Points?: number;
  liveT2Points?: number;
  liveCurrentSet?: number;
  liveServingTeam?: 'team1' | 'team2';
  liveServerPlayerIndex?: 0 | 1; // 0 for player1, 1 for player2
  liveT1LastServerIndex?: 0 | 1; // Last served player index
  liveT2LastServerIndex?: 0 | 1;
  liveLeftTeam?: 'team1' | 'team2';
  liveRightTeam?: 'team1' | 'team2';
  liveP1ServerName?: string;
  liveP2ServerName?: string;
  liveP3ServerName?: string;
  liveP4ServerName?: string;
  liveT1TimeoutsUsed?: number; // 0 or 1 timeout used
  liveT2TimeoutsUsed?: number; // 0 or 1 timeout used
  phase?: 'gironi' | 'eliminazione'; // Phase category
  groupName?: string; // Name of group, e.g. "Girone A" for pool stage
  pointsPerSet?: 15 | 21; // Point threshold for a set
  maxSets?: 1 | 3; // Number of sets (e.g., best of 3 or 1 set)
  outcomeType?: 'normal' | 'injury_during' | 'injury_before' | 'forfeit';
  retiredTeamId?: string; // ID of the team that retired/injured/absent
  isManuallyScheduled?: boolean; // If schedule was modified manually or shifted
  matchMvp?: string; // Best player of the match voted by admin/collaborator
}

export interface NotificationLog {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'live_update' | 'schedule_change' | 'system' | 'result';
  matchId?: string;
}

export interface TournamentConfig {
  name: string;
  teamsCount: 4 | 8 | 16;
  courtCount: number;
  startTime: string; // e.g. "09:00"
  matchDurationMinutes: number;
}

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'collaborator' | 'reader' | 'ATLETA';
  genere?: 'M' | 'F';
  createdAt: string;
  isTeamUser?: boolean;
  nome?: string;
  cognome?: string;
  telefono?: string;
  activeSessionId?: string;
  lastActiveAt?: number;
  dataNascita?: string; // Data di nascita
  isAthlete?: boolean; // Se lo staff è anche atleta o se abilitato
  createdBy?: string; // Username of the admin/collaborator who created the account
  isTesseratoWsicily?: boolean; // Se l'utente è tesserato Wsicily
}

export interface RegistrationRequest {
  id: string; // unique ID, e.g. username
  username: string;
  password?: string;
  role: 'admin' | 'collaborator' | 'reader' | 'ATLETA';
  nome: string;
  cognome: string;
  telefono: string;
  genere?: 'M' | 'F';
  dataNascita?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  isAthlete?: boolean;
}

export interface ArchivedTournament {
  id: string;
  name: string;
  date: string;
  formula: string;
  teamsCount: number;
  teams: Team[];
  matches?: Match[];
  winnerTeamName?: string;
  podium?: {
    first: Team | null;
    second: Team | null;
    third: Team | null;
  };
}

export interface ActiveTournamentSave {
  id: string;
  name: string;
  date: string;
  formula: string;
  teamsCount: number;
  teams: Team[];
  matches: Match[];
  activeTournamentConfig: any;
  admittedTeamsCount: number | null;
  savedBy?: string;
  notifications?: NotificationLog[];
  timestamp?: number;
  teamUsers?: AppUser[];
  tournamentDate?: string;
  tournamentLocation?: string;
  tournamentGender?: "maschile" | "misto" | "femminile" | "";
  visibilitySettings?: {
    entryList: boolean;
    bracket: boolean;
    standings: boolean;
    notifications: boolean;
    freePlay?: boolean;
    social?: boolean;
  };
  mvpVotes?: any[];
  mvpSettings?: {
    publishedMvp: any;
    mvpVotingEnabled: boolean;
  };
}

export interface FreePlayMatch {
  id: string;
  player1AId: string;
  player1AName: string;
  player1BId: string;
  player1BName: string;
  player2AId: string;
  player2AName: string;
  player2BId: string;
  player2BName: string;
  createdAt: string; // ISO String or Local timestamp
  status: 'pending' | 'completed';
  completedAt?: string;
  date: string; // e.g. YYYY-MM-DD
}

export interface SocialPost {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  content: string;
  imageUrl?: string;
  createdAt: number; // millisecond timestamp
  expiresAt: number; // millisecond timestamp (createdAt + 24h)
}


