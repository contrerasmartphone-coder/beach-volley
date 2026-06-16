export interface Team {
  id: string;
  name: string;
  player1: string;
  player2: string;
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
  phase?: 'gironi' | 'eliminazione'; // Phase category
  groupName?: string; // Name of group, e.g. "Girone A" for pool stage
  pointsPerSet?: 15 | 21; // Point threshold for a set
  maxSets?: 1 | 3; // Number of sets (e.g., best of 3 or 1 set)
  outcomeType?: 'normal' | 'injury_during' | 'injury_before' | 'forfeit';
  retiredTeamId?: string; // ID of the team that retired/injured/absent
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
  role: 'admin' | 'collaborator' | 'reader';
  createdAt: string;
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
}

