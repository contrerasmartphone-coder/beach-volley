import { Team, Match, SetScore } from './types';

// Pre-configured team duos for beach volley demo
export const DEMO_TEAMS: Omit<Team, 'wins' | 'losses' | 'setsWon' | 'setsLost' | 'pointsWon' | 'pointsLost' | 'points'>[] = [
  { id: 't1', name: 'Sand Storms', player1: 'Alessandro Rossi', player2: 'Marco Bianchi', level: 'Gold', phone: '3331234567', email: 'alessandro.rossi@gmail.com', phone2: '3398877665', email2: 'marco.bianchi@gmail.com', registeredAt: '2026-05-25 09:15' },
  { id: 't2', name: 'Golden Blocks', player1: 'Filippo Neri', player2: 'Guido Verdi', level: 'Gold', phone: '3349876543', email: 'filippo.neri@gmail.com', phone2: '3405566778', email2: 'guido.verdi@gmail.com', registeredAt: '2026-05-25 09:45' },
  { id: 't3', name: 'Sky Jumpers', player1: 'Luca Ferrari', player2: 'Matteo Colombo', level: 'Silver', phone: '3452233445', email: 'l.ferrari@live.it', phone2: '3312244668', email2: 'm.colombo@live.it', registeredAt: '2026-05-25 10:30' },
  { id: 't4', name: 'Beach Aces', player1: 'Simone Ricci', player2: 'Davide Bruno', level: 'Gold', phone: '3471122334', email: 's.ricci@outlook.it', phone2: '3456677889', email2: 'd.bruno@outlook.it', registeredAt: '2026-05-25 11:15' },
  { id: 't5', name: 'Wave Riders', player1: 'Claudio Moretti', player2: 'Fabio Rizzo', level: 'Silver', phone: '3209871234', email: 'c.moretti@gmail.com', phone2: '3287766554', email2: 'f.rizzo@gmail.com', registeredAt: '2026-05-25 14:00' },
  { id: 't6', name: 'Spike Kings', player1: 'Andrea Mancini', player2: 'Giorgio Costa', level: 'Beginner', phone: '3495566778', email: 'a.mancini@libero.it', phone2: '3334455667', email2: 'g.costa@libero.it', registeredAt: '2026-05-25 15:30' },
  { id: 't7', name: 'Sideout Pros', player1: 'Stefano Gallo', player2: 'Roberto Conti', level: 'Gold', phone: '3354433221', email: 's.gallo@yahoo.com', phone2: '3389988776', email2: 'r.conti@yahoo.com', registeredAt: '2026-05-26 08:30' },
  { id: 't8', name: 'Sun Blockers', player1: 'Enrico Villa', player2: 'Gianni Serra', level: 'Beginner', phone: '3281230000', email: 'e.villa@gmail.com', phone2: '3294455660', email2: 'g.serra@gmail.com', registeredAt: '2026-05-26 09:00' },
  { id: 't9', name: 'Vento d\'Estate', player1: 'Emanuele Gatti', player2: 'Pietro Fontana', level: 'Bronze', phone: '3318899110', email: 'e.gatti@gmail.com', phone2: '3459988112', email2: 'p.fontana@gmail.com', registeredAt: '2026-05-26 10:15' },
  { id: 't10', name: 'Pazzi della Sabbia', player1: 'Daniele Marini', player2: 'Lorenzo Greco', level: 'Beginner', phone: '3404455662', email: 'd.marini@hotmail.com', phone2: '3471133559', email2: 'l.greco@hotmail.com', registeredAt: '2026-05-26 11:00' },
  { id: 't11', name: 'Beach Boys', player1: 'Alberto Barbieri', player2: 'Federico Leone', level: 'Bronze', phone: '3426677881', email: 'a.barbieri@outlook.com', phone2: '3351122334', email2: 'f.leone@outlook.com', registeredAt: '2026-05-26 14:30' },
  { id: 't12', name: 'Hot Spikes', player1: 'Gabriele Longo', player2: 'Valerio Martinelli', level: 'Gold', phone: '3397788995', email: 'g.longo@gmail.com', phone2: '3318822554', email2: 'v.martinelli@gmail.com', registeredAt: '2026-05-26 15:00' },
  { id: 't13', name: 'Bassa Difesa', player1: 'Michele Esposito', player2: 'Salvatore Romano', level: 'Beginner', phone: '3271133557', email: 'm.esposito@libero.it', phone2: '3384455112', email2: 's.romano@libero.it', registeredAt: '2026-05-26 16:15' },
  { id: 't14', name: 'Sabbia Caliente', player1: 'Vincenzo Vitale', player2: 'Antonio De Luca', level: 'Bronze', phone: '3468822446', email: 'v.vitale@live.com', phone2: '3495566112', email2: 'a.deluca@live.com', registeredAt: '2026-05-26 17:00' },
  { id: 't15', name: 'Net Rippers', player1: 'Giuseppe Cozza', player2: 'Fabrizio Russo', level: 'Silver', phone: '3315554442', email: 'g.cozza@gmail.com', phone2: '3337788221', email2: 'f.russo@gmail.com', registeredAt: '2026-05-26 18:45' },
  { id: 't16', name: 'Volley Monsters', player1: 'Christian Bernardi', player2: 'Manuel Pellegrini', level: 'Gold', phone: '3482211447', email: 'c.bernardi@gmail.com', phone2: '3471199334', email2: 'm.pellegrini@gmail.com', registeredAt: '2026-05-26 19:30' },
];

export const BYE_TEAM: Team = {
  id: 'bye',
  name: 'BYE',
  player1: 'N/A',
  player2: 'N/A',
  level: 'Beginner',
  phone: '',
  email: '',
  phone2: '',
  email2: '',
  registeredAt: '2026-05-27',
  wins: 0,
  losses: 0,
  setsWon: 0,
  setsLost: 0,
  pointsWon: 0,
  pointsLost: 0,
  points: 0,
};

export function isByeTeam(team: Team | null | undefined): boolean {
  if (!team) return false;
  const idLower = (team.id || '').toLowerCase();
  const nameLower = (team.name || '').toLowerCase();
  return idLower.startsWith('bye') || nameLower.includes('bye');
}

const LEVEL_WEIGHTS: Record<string, number> = {
  'Gold': 4,
  'Silver': 3,
  'Bronze': 2,
  'Beginner': 1
};

export function sortTeamsByEntryList<T extends { level: 'Beginner' | 'Bronze' | 'Silver' | 'Gold'; registeredAt: string }>(teamsList: T[]): T[] {
  return [...teamsList].sort((a, b) => {
    const wA = LEVEL_WEIGHTS[a.level] || 0;
    const wB = LEVEL_WEIGHTS[b.level] || 0;
    if (wB !== wA) {
      return wB - wA; // Higher level weight comes first (Gold > Silver etc.)
    }
    // Secondary: older/earlier registration comes first
    return a.registeredAt.localeCompare(b.registeredAt);
  });
}

export function autoResolveMatchWithByes(match: Match): Match | null {
  if (match.status === 'completed') return null;
  if (!match.team1 || !match.team2) return null;

  const isT1Bye = isByeTeam(match.team1);
  const isT2Bye = isByeTeam(match.team2);

  if (!isT1Bye && !isT2Bye) return null; // No BYEs, play normally

  const maxSets = match.maxSets || 3;
  const pointsPerSet = match.pointsPerSet || 21;

  let team1Score = 0;
  let team2Score = 0;
  const sets: SetScore[] = [];

  if (isT1Bye && isT2Bye) {
    // Both are BYEs, team1 wins by default
    team1Score = maxSets === 1 ? 1 : 2;
    for (let i = 0; i < team1Score; i++) {
      sets.push({ team1: pointsPerSet, team2: 0 });
    }
    return {
      ...match,
      status: 'completed',
      team1Score,
      team2Score,
      sets,
      winnerId: match.team1.id,
    };
  }

  if (isT1Bye) {
    // Team 2 wins against BYE
    team2Score = maxSets === 1 ? 1 : 2;
    for (let i = 0; i < team2Score; i++) {
      sets.push({ team1: 0, team2: pointsPerSet });
    }
    return {
      ...match,
      status: 'completed',
      team1Score: 0,
      team2Score,
      sets,
      winnerId: match.team2.id,
    };
  } else {
    // Team 1 wins against BYE
    team1Score = maxSets === 1 ? 1 : 2;
    for (let i = 0; i < team1Score; i++) {
      sets.push({ team1: pointsPerSet, team2: 0 });
    }
    return {
      ...match,
      status: 'completed',
      team1Score,
      team2Score: 0,
      sets,
      winnerId: match.team1.id,
    };
  }
}

export function autoResolveAndPropagate(matches: Match[]): Match[] {
  let updated = [...matches];
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 100) {
    changed = false;
    iterations++;

    for (let i = 0; i < updated.length; i++) {
      const m = updated[i];
      if (m.status !== 'completed' && m.team1 && m.team2) {
        const resolved = autoResolveMatchWithByes(m);
        if (resolved) {
          updated[i] = resolved;
          changed = true;

          // Propagate Winner
          if (resolved.winnerId && resolved.nextMatchId) {
            const winnerTeam = resolved.winnerId === resolved.team1?.id ? resolved.team1 : resolved.team2;
            const nextMatchIndex = updated.findIndex(nm => nm.id === resolved.nextMatchId);
            if (nextMatchIndex !== -1 && winnerTeam) {
              const nextMatch = { ...updated[nextMatchIndex] };
              if (resolved.nextMatchSlot === 'team1') {
                if (nextMatch.team1?.id !== winnerTeam.id) {
                  nextMatch.team1 = winnerTeam;
                  updated[nextMatchIndex] = nextMatch;
                }
              } else {
                if (nextMatch.team2?.id !== winnerTeam.id) {
                  nextMatch.team2 = winnerTeam;
                  updated[nextMatchIndex] = nextMatch;
                }
              }
            }
          }

          // Propagate Loser (e.g. for Double Elimination)
          if (resolved.winnerId && resolved.loserMatchId) {
            const loserTeam = resolved.winnerId === resolved.team1?.id ? resolved.team2 : resolved.team1;
            const loserMatchIndex = updated.findIndex(nm => nm.id === resolved.loserMatchId);
            if (loserMatchIndex !== -1 && loserTeam) {
              const loserMatch = { ...updated[loserMatchIndex] };
              if (resolved.loserMatchSlot === 'team1') {
                if (loserMatch.team1?.id !== loserTeam.id) {
                  loserMatch.team1 = loserTeam;
                  updated[loserMatchIndex] = loserMatch;
                }
              } else {
                if (loserMatch.team2?.id !== loserTeam.id) {
                  loserMatch.team2 = loserTeam;
                  updated[loserMatchIndex] = loserMatch;
                }
              }
            }
          }
        }
      }
    }
  }
  return updated;
}

export function getInitialTeamStats(team: Omit<Team, 'wins' | 'losses' | 'setsWon' | 'setsLost' | 'pointsWon' | 'pointsLost' | 'points'>): Team {
  return {
    ...team,
    wins: 0,
    losses: 0,
    setsWon: 0,
    setsLost: 0,
    pointsWon: 0,
    pointsLost: 0,
    points: 0,
  };
}

export function generateDirectEliminationBracket(
  teams: Team[],
  teamsLimit: number,
  startHour: string = '09:00',
  durationMinutes: number = 40,
  pointsPerSet?: 15 | 21,
  maxSets?: 1 | 3,
  sfPointsPerSet?: 15 | 21,
  sfMaxSets?: 1 | 3
): Match[] {
  const matches: Match[] = [];
  
  // Select top teams up to standard bracket limit strictly based on earliest registration date/time
  const chronologicallySorted = [...teams].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
  const admittedRaw = chronologicallySorted.slice(0, teamsLimit);
  // Re-sort the admitted teams based on Entry List classement criteria (level, registration) for seeding
  const selectedTeams = sortTeamsByEntryList(admittedRaw);

  // Pad with BYE_TEAM if we don't have enough teams
  const finalTeams: Team[] = [...selectedTeams];
  let byeCount = 1;
  while (finalTeams.length < teamsLimit) {
    finalTeams.push({
      ...BYE_TEAM,
      id: `bye_direct_${finalTeams.length}`,
      name: `BYE ${byeCount++}`
    });
  }

  // Calculate rounds based on teams selection
  // 32 teams: 5 rounds (Sedicesimi, Ottavi, Quarti, Semi, Finale)
  // 16 teams: 4 rounds (Ottavi, Quarti, Semi, Finale)
  // 8 teams: 3 rounds (Quarti, Semi, Finale)
  // 4 teams: 2 rounds (Semi, Finale)
  const totalRounds = Math.log2(teamsLimit);

  // Initialize all matches across all rounds
  let currentRoundUnits = teamsLimit / 2;
  let matchIdCounter = 1;
  const roundMatchesByRound: Match[][] = [];

  // Parse start hour
  const [startHr, startMin] = startHour.split(':').map(Number);

  for (let r = 1; r <= totalRounds; r++) {
    const roundMatches: Match[] = [];
    const maxPositions = currentRoundUnits;
    
    // Determiniamo il nome del round
    let roundLabel = '';
    if (currentRoundUnits === 16) roundLabel = 'Sedicesimi di finale';
    else if (currentRoundUnits === 8) roundLabel = 'Ottavi di finale';
    else if (currentRoundUnits === 4) roundLabel = 'Quarti di finale';
    else if (currentRoundUnits === 2) roundLabel = 'Semifinali';
    else if (currentRoundUnits === 1) roundLabel = 'Finale';
    else roundLabel = `Turno a ${currentRoundUnits * 2} squadre`;

    for (let p = 1; p <= maxPositions; p++) {
      // Calculate scheduling details
      // Simple logic: staggered starts or multiple courts
      const totalOffsetMinutes = (r - 1) * 120 + Math.floor((p - 1) / 2) * durationMinutes;
      const matchDate = new Date();
      matchDate.setHours(startHr, startMin + totalOffsetMinutes, 0);
      
      const hh = String(matchDate.getHours()).padStart(2, '0');
      const mm = String(matchDate.getMinutes()).padStart(2, '0');
      const timeStr = `${hh}:${mm}`;

      const courtNum = ((p - 1) % 2) + 1; // Alternating 2 courts default

      const isSFOrFinal = roundLabel.includes('Semifinali') || roundLabel.includes('Finale');

      const match: Match = {
        id: `m-${matchIdCounter++}`,
        round: r,
        roundLabel,
        position: p,
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        sets: [],
        status: 'scheduled',
        court: `Campo ${courtNum}`,
        time: timeStr,
        pointsPerSet: isSFOrFinal ? (sfPointsPerSet || pointsPerSet) : pointsPerSet,
        maxSets: isSFOrFinal ? (sfMaxSets || maxSets) : maxSets,
      };

      roundMatches.push(match);
    }
    roundMatchesByRound.push(roundMatches);
    currentRoundUnits = currentRoundUnits / 2;
  }

  // Assign Round 1 teams - paired as "prima contro ultima" (1st vs Nth, 2nd vs N-1th...)
  const round1Matches = roundMatchesByRound[0];
  for (let i = 0; i < round1Matches.length; i++) {
    const m = round1Matches[i];
    m.team1 = finalTeams[i];
    m.team2 = finalTeams[finalTeams.length - 1 - i];
  }

  // Connect matches to future rounds
  for (let r = 0; r < roundMatchesByRound.length - 1; r++) {
    const currentRound = roundMatchesByRound[r];
    const nextRound = roundMatchesByRound[r + 1];

    for (let i = 0; i < currentRound.length; i++) {
      const match = currentRound[i];
      // Every 2 matches in current round feed to 1 match in next round
      const nextMatchIndex = Math.floor(i / 2);
      const nextMatch = nextRound[nextMatchIndex];
      match.nextMatchId = nextMatch.id;
      match.nextMatchSlot = i % 2 === 0 ? 'team1' : 'team2';
    }
  }

  // Insert 3rd/4th place final match if there are at least 2 rounds (e.g. Semifinals and Finals)
  if (totalRounds >= 2) {
    const finalRoundMatches = roundMatchesByRound[totalRounds - 1];
    const semiRound = roundMatchesByRound[totalRounds - 2];
    const semi1 = semiRound[0];
    const semi2 = semiRound[1];

    if (semi1 && semi2 && finalRoundMatches && finalRoundMatches.length > 0) {
      const grandFinal = finalRoundMatches[0];
      const final3rd: Match = {
        id: `m-${matchIdCounter++}`,
        round: totalRounds,
        roundLabel: 'Finale 3°/4° Posto',
        position: 2,
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        sets: [],
        status: 'scheduled',
        court: 'Campo 2',
        time: grandFinal ? grandFinal.time : '12:00',
        pointsPerSet: sfPointsPerSet || pointsPerSet,
        maxSets: sfMaxSets || maxSets,
      };

      finalRoundMatches.push(final3rd);

      // Feed losers from Semifinals
      semi1.loserMatchId = final3rd.id;
      semi1.loserMatchSlot = 'team1';
      semi2.loserMatchId = final3rd.id;
      semi2.loserMatchSlot = 'team2';
    }
  }

  // Combine to a flat array
  const allMatches: Match[] = [];
  roundMatchesByRound.forEach(rm => allMatches.push(...rm));
  return autoResolveAndPropagate(allMatches);
}

// Generate an individual set score for simulation
export function simulateSetScore(p1Bias: number = 0.5, isTieBreak: boolean = false, targetPoints: number = 21): SetScore {
  const finalTargetPoints = isTieBreak ? 15 : targetPoints;
  let p1 = 0;
  let p2 = 0;

  while (true) {
    if (Math.random() < p1Bias) {
      p1++;
    } else {
      p2++;
    }

    if (p1 >= finalTargetPoints || p2 >= finalTargetPoints) {
      if (Math.abs(p1 - p2) >= 2) {
        break;
      }
    }
  }

  return { team1: p1, team2: p2 };
}

// Create a completely random completed match outcome
export function simulateCompletedMatch(match: Match): Match {
  if (!match.team1 || !match.team2) return match;

  const bias = 0.4 + Math.random() * 0.2; // random bias between 0.4 and 0.6
  const sets: SetScore[] = [];
  let t1Sets = 0;
  let t2Sets = 0;

  const pointsPerSet = match.pointsPerSet || 21;
  const maxSets = match.maxSets || 3;

  if (maxSets === 1) {
    // Single Set format
    const s1 = simulateSetScore(bias, false, pointsPerSet);
    sets.push(s1);
    if (s1.team1 > s1.team2) t1Sets++; else t2Sets++;
  } else {
    // Best of 3 format
    // Set 1
    const s1 = simulateSetScore(bias, false, pointsPerSet);
    sets.push(s1);
    if (s1.team1 > s1.team2) t1Sets++; else t2Sets++;

    // Set 2
    const s2 = simulateSetScore(bias, false, pointsPerSet);
    sets.push(s2);
    if (s2.team1 > s2.team2) t1Sets++; else t2Sets++;

    // Set 3 (Tie-break if needed)
    if (t1Sets === 1 && t2Sets === 1) {
      const s3 = simulateSetScore(bias, true, pointsPerSet);
      sets.push(s3);
      if (s3.team1 > s3.team2) t1Sets++; else t2Sets++;
    }
  }

  return {
    ...match,
    status: 'completed',
    team1Score: t1Sets,
    team2Score: t2Sets,
    sets,
    winnerId: t1Sets > t2Sets ? match.team1.id : match.team2.id,
  };
}

// Recompute whole team stats from completed matches
export function computeTeamStats(teams: Team[], matches: Match[]): Team[] {
  // Reset stats
  const resetTeams = teams.map(t => ({
    ...t,
    wins: 0,
    losses: 0,
    setsWon: 0,
    setsLost: 0,
    pointsWon: 0,
    pointsLost: 0,
    points: 0,
  }));

  const teamMap = new Map<string, typeof resetTeams[0]>();
  resetTeams.forEach(t => teamMap.set(t.id, t));

  matches.forEach(m => {
    if (m.status !== 'completed' || !m.team1 || !m.team2) return;

    const isT1Bye = m.team1.id.startsWith('bye');
    const isT2Bye = m.team2.id.startsWith('bye');

    if (isT1Bye && isT2Bye) return;

    const t1 = teamMap.get(m.team1.id);
    const t2 = teamMap.get(m.team2.id);

    if (isT1Bye) {
      if (t2) {
        t2.wins += 1;
        t2.points += 3;
        t2.setsWon += m.team2Score;
        t2.setsLost += m.team1Score;
        m.sets.forEach(s => {
          t2.pointsWon += s.team2;
          t2.pointsLost += s.team1;
        });
      }
      return;
    }

    if (isT2Bye) {
      if (t1) {
        t1.wins += 1;
        t1.points += 3;
        t1.setsWon += m.team1Score;
        t1.setsLost += m.team2Score;
        m.sets.forEach(s => {
          t1.pointsWon += s.team1;
          t1.pointsLost += s.team2;
        });
      }
      return;
    }

    if (!t1 || !t2) return;

    // Set wins/losses
    if (m.team1Score > m.team2Score) {
      t1.wins += 1;
      t1.points += 3; // 3 points for winning the match
      t2.losses += 1;
      t2.points += 1; // 1 point for losing (participation/ranking points in beach volley)
    } else {
      t2.wins += 1;
      t2.points += 3;
      t1.losses += 1;
      t1.points += 1;
    }

    // Set score tallying
    t1.setsWon += m.team1Score;
    t1.setsLost += m.team2Score;
    t2.setsWon += m.team2Score;
    t2.setsLost += m.team1Score;

    // Detailed points tallying
    m.sets.forEach(s => {
      t1.pointsWon += s.team1;
      t1.pointsLost += s.team2;
      t2.pointsWon += s.team2;
      t2.pointsLost += s.team1;
    });
  });

  return Array.from(teamMap.values());
}

// Split teams into balanced groups using serpentine level-balancing
export function splitTeamsIntoGroups(teams: Team[], groupCount: number): Record<string, Team[]> {
  const sorted = sortTeamsByEntryList(teams);

  const groups: Record<string, Team[]> = {};
  for (let i = 0; i < groupCount; i++) {
    const char = String.fromCharCode(65 + i); // 'A', 'B', 'C', etc.
    groups[`Girone ${char}`] = [];
  }

  let forward = true;
  let currentGroupIdx = 0;

  sorted.forEach((team) => {
    const groupName = `Girone ${String.fromCharCode(65 + currentGroupIdx)}`;
    groups[groupName].push({ ...team, group: groupName });

    if (forward) {
      if (currentGroupIdx === groupCount - 1) {
        forward = false;
      } else {
        currentGroupIdx++;
      }
    } else {
      if (currentGroupIdx === 0) {
        forward = true;
      } else {
        currentGroupIdx--;
      }
    }
  });

  return groups;
}

// Generate round-robin matches for groups (pools)
export function generateRoundRobinMatches(
  groups: Record<string, Team[]>,
  startHour: string = '09:00',
  durationMinutes: number = 40,
  courtCount: number = 2,
  pointsPerSet?: 15 | 21,
  maxSets?: 1 | 3
): Match[] {
  const matches: Match[] = [];
  const groupNames = Object.keys(groups);
  let matchIdCounter = 1001; // Start with different range to easily identify group matches

  // Parse start hour
  const [startHr, startMin] = startHour.split(':').map(Number);
  let globalMatchIndex = 0;

  groupNames.forEach((groupName) => {
    // Clone and pad if odd length to make it standard round-robin with resting default victory
    const groupTeams = [...groups[groupName]];
    if (groupTeams.length > 0 && groupTeams.length % 2 !== 0) {
      groupTeams.push({
        ...BYE_TEAM,
        id: `bye_group_${groupName}_${groupTeams.length}`,
        name: `BYE_riposo`,
        group: groupName,
      });
    }
    const n = groupTeams.length;
    if (n < 2) return;

    // Generate standard pairings
    const pairings: [Team, Team][] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairings.push([groupTeams[i], groupTeams[j]]);
      }
    }

    // Schedule pairings
    pairings.forEach(([team1, team2]) => {
      // Court assignment: alternate among available courts
      const courtIndex = (globalMatchIndex % courtCount) + 1;
      const court = `Campo ${courtIndex}`;

      // Time offset: we can play matches in parallel if we have multiple courts
      const timeSlotIndex = Math.floor(globalMatchIndex / courtCount);
      const totalOffsetMinutes = timeSlotIndex * durationMinutes;
      
      const matchDate = new Date();
      matchDate.setHours(startHr, startMin + totalOffsetMinutes, 0);
      
      const hh = String(matchDate.getHours()).padStart(2, '0');
      const mm = String(matchDate.getMinutes()).padStart(2, '0');
      const timeStr = `${hh}:${mm}`;

      matches.push({
        id: `m-g-${matchIdCounter++}`,
        round: 1,
        roundLabel: `${groupName}`,
        position: globalMatchIndex + 1,
        team1,
        team2,
        team1Score: 0,
        team2Score: 0,
        sets: [],
        status: 'scheduled',
        court,
        time: timeStr,
        phase: 'gironi',
        groupName,
        pointsPerSet,
        maxSets,
      });

      globalMatchIndex++;
    });
  });

  return autoResolveAndPropagate(matches);
}

// Compute group standings independently
export function computeGroupStandings(teams: Team[], groupMatches: Match[]): Record<string, Team[]> {
  const computedTeams = computeTeamStats(teams, groupMatches);
  const groups: Record<string, Team[]> = {};

  computedTeams.forEach(t => {
    if (t.group) {
      if (!groups[t.group]) groups[t.group] = [];
      groups[t.group].push(t);
    }
  });

  // Sort each group's teams
  Object.keys(groups).forEach(gName => {
    groups[gName].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const aSetRatio = a.setsWon / (a.setsLost || 1);
      const bSetRatio = b.setsWon / (b.setsLost || 1);
      if (bSetRatio !== aSetRatio) return bSetRatio - aSetRatio;
      const aPointRatio = a.pointsWon / (a.pointsLost || 1);
      const bPointRatio = b.pointsWon / (b.pointsLost || 1);
      return bPointRatio - aPointRatio;
    });
  });

  return groups;
}

// Generate Playoff single elimination matches on-the-fly from final group standings
export function generatePlayoffsFromGroups(
  groupsStandings: Record<string, Team[]>,
  startHour: string = '15:30',
  durationMinutes: number = 45,
  courtCount: number = 2,
  pointsPerSet?: 15 | 21,
  maxSets?: 1 | 3,
  sfPointsPerSet?: 15 | 21,
  sfMaxSets?: 1 | 3
): Match[] {
  const groupNames = Object.keys(groupsStandings).sort();
  const qualifiers: Team[] = [];

  // Determine stage layout based on group count
  let mode: 'final_only' | 'semis' | 'quorters' = 'final_only';
  
  if (groupNames.length === 2) {
    // 2 groups -> Semifinals (top 2 from each group)
    mode = 'semis';
    const gA = groupsStandings[groupNames[0]] || [];
    const gB = groupsStandings[groupNames[1]] || [];
    
    // Seed standard matchups:
    // Semifinal 1: 1st A vs 2nd B
    // Semifinal 2: 1st B vs 2nd A
    const firstA = gA[0] || null;
    const secondB = gB[1] || gB[0] || null; // fallback if group is small
    const firstB = gB[0] || null;
    const secondA = gA[1] || gA[0] || null;

    qualifiers.push(firstA, secondB, firstB, secondA);
  } else if (groupNames.length >= 4) {
    // 4 groups -> Quarters (top 2 from each group)
    mode = 'quorters';
    const gA = groupsStandings[groupNames[0]] || [];
    const gB = groupsStandings[groupNames[1]] || [];
    const gC = groupsStandings[groupNames[2]] || [];
    const gD = groupsStandings[groupNames[3]] || [];

    qualifiers.push(
      gA[0] || null, gB[1] || null, // Q1
      gC[0] || null, gD[1] || null, // Q2
      gB[0] || null, gA[1] || null, // Q3
      gD[0] || null, gC[1] || null  // Q4
    );
  } else {
    // 1 group -> Grand Finale (1st vs 2nd)
    mode = 'final_only';
    const gA = groupsStandings[groupNames[0]] || [];
    qualifiers.push(gA[0] || null, gA[1] || null);
  }

  // Generate elimination bracket matches
  const playoffTeamsCount = mode === 'quorters' ? 8 : (mode === 'semis' ? 4 : 2);
  const totalRounds = Math.log2(playoffTeamsCount);
  const matches: Match[] = [];
  
  let currentRoundUnits = playoffTeamsCount / 2;
  let matchIdCounter = 5001; // Start at 5001 for playoffs
  const roundMatchesByRound: Match[][] = [];

  const [startHr, startMin] = startHour.split(':').map(Number);

  for (let r = 1; r <= totalRounds; r++) {
    const roundMatches: Match[] = [];
    const maxPositions = currentRoundUnits;
    
    let roundLabel = '';
    if (currentRoundUnits === 4) roundLabel = 'Quarti di finale';
    else if (currentRoundUnits === 2) roundLabel = 'Semifinali';
    else if (currentRoundUnits === 1) roundLabel = 'Finale';

    for (let p = 1; p <= maxPositions; p++) {
      const totalOffsetMinutes = (r - 1) * 90 + Math.floor((p - 1) / 2) * durationMinutes;
      const matchDate = new Date();
      matchDate.setHours(startHr, startMin + totalOffsetMinutes, 0);
      
      const hh = String(matchDate.getHours()).padStart(2, '0');
      const mm = String(matchDate.getMinutes()).padStart(2, '0');
      const timeStr = `${hh}:${mm}`;

      const courtNum = ((p - 1) % courtCount) + 1;

      const isSFOrFinal = roundLabel.includes('Semifinali') || roundLabel.includes('Finale');

      const match: Match = {
        id: `m-p-${matchIdCounter++}`,
        round: r,
        roundLabel,
        position: p,
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        sets: [],
        status: 'scheduled',
        court: `Campo ${courtNum}`,
        time: timeStr,
        phase: 'eliminazione',
        pointsPerSet: isSFOrFinal ? (sfPointsPerSet || pointsPerSet) : pointsPerSet,
        maxSets: isSFOrFinal ? (sfMaxSets || maxSets) : maxSets,
      };

      roundMatches.push(match);
    }
    roundMatchesByRound.push(roundMatches);
    currentRoundUnits = currentRoundUnits / 2;
  }

  // Pre-seed Round 1 of playoffs with the calculated qualifiers
  const round1Matches = roundMatchesByRound[0];
  if (round1Matches) {
    for (let i = 0; i < round1Matches.length; i++) {
      const m = round1Matches[i];
      m.team1 = qualifiers[i * 2] || BYE_TEAM;
      m.team2 = qualifiers[i * 2 + 1] || BYE_TEAM;
    }
  }

  // Connect matches for future playoff rounds
  for (let r = 0; r < roundMatchesByRound.length - 1; r++) {
    const currentRound = roundMatchesByRound[r];
    const nextRound = roundMatchesByRound[r + 1];

    for (let i = 0; i < currentRound.length; i++) {
      const match = currentRound[i];
      const nextMatchIndex = Math.floor(i / 2);
      const nextMatch = nextRound[nextMatchIndex];
      match.nextMatchId = nextMatch.id;
      match.nextMatchSlot = i % 2 === 0 ? 'team1' : 'team2';
    }
  }

  // Insert 3rd/4th place final match if there are at least 2 rounds (e.g. Semifinals and Finals)
  if (totalRounds >= 2) {
    const finalRoundMatches = roundMatchesByRound[totalRounds - 1];
    const semiRound = roundMatchesByRound[totalRounds - 2];
    const semi1 = semiRound[0];
    const semi2 = semiRound[1];

    if (semi1 && semi2 && finalRoundMatches && finalRoundMatches.length > 0) {
      const grandFinal = finalRoundMatches[0];
      const final3rd: Match = {
        id: `m-p-${matchIdCounter++}`,
        round: totalRounds,
        roundLabel: 'Finale 3°/4° Posto',
        position: 2,
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        sets: [],
        status: 'scheduled',
        court: 'Campo 2',
        time: grandFinal ? grandFinal.time : '12:00',
        phase: 'eliminazione',
        pointsPerSet: sfPointsPerSet || pointsPerSet,
        maxSets: sfMaxSets || maxSets,
      };

      finalRoundMatches.push(final3rd);

      // Feed losers from Semifinals
      semi1.loserMatchId = final3rd.id;
      semi1.loserMatchSlot = 'team1';
      semi2.loserMatchId = final3rd.id;
      semi2.loserMatchSlot = 'team2';
    }
  }

  // Flatten
  roundMatchesByRound.forEach(rm => matches.push(...rm));
  return autoResolveAndPropagate(matches);
}

export function generateDoubleEliminationBracket(
  teams: Team[],
  startHour: string = '09:00',
  durationMinutes: number = 40,
  pointsPerSet?: 15 | 21,
  maxSets?: 1 | 3,
  sfPointsPerSet?: 15 | 21,
  sfMaxSets?: 1 | 3
): Match[] {
  const matches: Match[] = [];
  
  // Select top 8 teams strictly based on earliest registration date/time
  const chronologicallySorted = [...teams].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
  const admittedRaw = chronologicallySorted.slice(0, 8);
  // Re-sort the admitted teams based on Entry List classement criteria (level, registration) for seeding
  const selectedTeams = sortTeamsByEntryList(admittedRaw);
  const finalTeams: Team[] = [...selectedTeams];
  let byeCount = 1;
  while (finalTeams.length < 8) {
    finalTeams.push({
      ...BYE_TEAM,
      id: `bye_double_${finalTeams.length}`,
      name: `BYE ${byeCount++}`
    });
  }

  const [startHr, startMin] = startHour.split(':').map(Number);

  // Helper to schedule match time and court
  const getScheduledTimeAndCourt = (index: number) => {
    // 2 courts default
    const courtNum = (index % 2) + 1;
    // Sequential blocks of matches (approx 40 minutes each)
    const block = Math.floor(index / 2);
    const totalOffsetMinutes = block * durationMinutes;
    const matchDate = new Date();
    matchDate.setHours(startHr, startMin + totalOffsetMinutes, 0);
    const hh = String(matchDate.getHours()).padStart(2, '0');
    const mm = String(matchDate.getMinutes()).padStart(2, '0');
    return {
      time: `${hh}:${mm}`,
      court: `Campo ${courtNum}`
    };
  };

  // MATCH 1-4: Primo Turno (Qualificazione) - paired as "prima contro ultima" (1st vs Nth, 2nd vs N-1th...)
  for (let i = 0; i < 4; i++) {
    const { time, court } = getScheduledTimeAndCourt(i);
    matches.push({
      id: `m-de-${i + 1}`,
      round: 1,
      roundLabel: 'Primo Turno',
      position: i + 1,
      team1: finalTeams[i],
      team2: finalTeams[7 - i],
      team1Score: 0,
      team2Score: 0,
      sets: [],
      status: 'scheduled',
      court,
      time,
      phase: 'eliminazione',
      nextMatchId: `m-de-${5 + Math.floor(i / 2)}`, // Matches 1,2 go to 5; Matches 3,4 go to 6
      nextMatchSlot: i % 2 === 0 ? 'team1' : 'team2',
      loserMatchId: `m-de-${7 + Math.floor(i / 2)}`, // Matches 1,2 go to 7; Matches 3,4 go to 8
      loserMatchSlot: i % 2 === 0 ? 'team1' : 'team2',
      pointsPerSet,
      maxSets,
    });
  }

  // MATCH 5-6: Tabellone Vincenti (Round 2)
  for (let i = 0; i < 2; i++) {
    const { time, court } = getScheduledTimeAndCourt(4 + i);
    matches.push({
      id: `m-de-${5 + i}`,
      round: 2,
      roundLabel: 'Tabellone Vincenti',
      position: i + 1,
      team1: null,
      team2: null,
      team1Score: 0,
      team2Score: 0,
      sets: [],
      status: 'scheduled',
      court,
      time,
      phase: 'eliminazione',
      nextMatchId: i === 0 ? 'm-de-9' : 'm-de-10', // Winner of 5 goes to m-de-9 slot team1, Winner of 6 goes to m-de-10 slot team2
      nextMatchSlot: i === 0 ? 'team1' : 'team2',
      pointsPerSet,
      maxSets,
    });
  }

  // MATCH 7-8: Tabellone Perdenti (Round 2)
  for (let i = 0; i < 2; i++) {
    const { time, court } = getScheduledTimeAndCourt(6 + i);
    matches.push({
      id: `m-de-${7 + i}`,
      round: 2,
      roundLabel: 'Tabellone Perdenti',
      position: 3 + i,
      team1: null,
      team2: null,
      team1Score: 0,
      team2Score: 0,
      sets: [],
      status: 'scheduled',
      court,
      time,
      phase: 'eliminazione',
      nextMatchId: i === 0 ? 'm-de-10' : 'm-de-9', // Winner of 7 goes to m-de-10 slot team1, Winner of 8 goes to m-de-9 slot team2 (crossover)
      nextMatchSlot: i === 0 ? 'team1' : 'team2',
      pointsPerSet,
      maxSets,
    });
  }

  // MATCH 9-10: Semifinali
  for (let i = 0; i < 2; i++) {
    const { time, court } = getScheduledTimeAndCourt(8 + i);
    matches.push({
      id: `m-de-${9 + i}`,
      round: 3,
      roundLabel: 'Semifinali',
      position: i + 1,
      team1: null,
      team2: null,
      team1Score: 0,
      team2Score: 0,
      sets: [],
      status: 'scheduled',
      court,
      time,
      phase: 'eliminazione',
      nextMatchId: 'm-de-11',
      nextMatchSlot: i === 0 ? 'team1' : 'team2',
      pointsPerSet: sfPointsPerSet || pointsPerSet,
      maxSets: sfMaxSets || maxSets,
    });
  }

  // MATCH 11: Finale
  const { time: fTime, court: fCourt } = getScheduledTimeAndCourt(10);
  matches.push({
    id: 'm-de-11',
    round: 4,
    roundLabel: 'Finale',
    position: 1,
    team1: null,
    team2: null,
    team1Score: 0,
    team2Score: 0,
    sets: [],
    status: 'scheduled',
    court: fCourt,
    time: fTime,
    phase: 'eliminazione',
    pointsPerSet: sfPointsPerSet || pointsPerSet,
    maxSets: sfMaxSets || maxSets,
  });

  return autoResolveAndPropagate(matches);
}
