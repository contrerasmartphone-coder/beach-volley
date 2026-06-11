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
  // But also ensuring odd seeds are in upper half, even seeds in lower half to prevent seed 1 and 2 meeting early.
  const round1Matches = roundMatchesByRound[0];
  if (teamsLimit > 2) {
    const halfSize = teamsLimit / 2;
    const quarterSize = halfSize / 2;
    let upperCount = 0;
    let lowerCount = 0;

    for (let j = 0; j < halfSize; j++) {
      const team1Val = finalTeams[j];
      const team2Val = finalTeams[teamsLimit - 1 - j];

      if ((j + 1) % 2 !== 0) {
        // Odd rank -> upper half (indices 0 to quarterSize - 1)
        if (upperCount < quarterSize) {
          const m = round1Matches[upperCount];
          m.team1 = team1Val;
          m.team2 = team2Val;
          upperCount++;
        }
      } else {
        // Even rank -> lower half (indices quarterSize to halfSize - 1)
        if (lowerCount < quarterSize) {
          const m = round1Matches[quarterSize + lowerCount];
          m.team1 = team1Val;
          m.team2 = team2Val;
          lowerCount++;
        }
      }
    }
  } else {
    for (let i = 0; i < round1Matches.length; i++) {
      const m = round1Matches[i];
      m.team1 = finalTeams[i];
      m.team2 = finalTeams[finalTeams.length - 1 - i];
    }
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
        t2.points += 2; // Bye gives 2 classification points
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
        t1.points += 2; // Bye gives 2 classification points
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

    const isT1Winner = m.team1Score > m.team2Score;
    const winner = isT1Winner ? t1 : t2;
    const loser = isT1Winner ? t2 : t1;

    winner.wins += 1;
    loser.losses += 1;

    // FIPAV point calculations within pools
    let winnerMatchPoints = 2;
    let loserMatchPoints = 1;

    if (m.outcomeType === 'forfeit') {
      loserMatchPoints = 0;
    }

    winner.points += winnerMatchPoints;
    loser.points += loserMatchPoints;

    // Handle sets and points based on termination type
    if (m.outcomeType === 'injury_before' || m.outcomeType === 'forfeit') {
      // Rule b and c: Winner gets sets won, 0 points recorded. Loser gets 0 sets.
      const targetSets = m.maxSets === 1 ? 1 : 2;
      winner.setsWon += targetSets;
      loser.setsLost += targetSets;
    } else {
      // Normal or injury during match (Rule a)
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
    }
  });

  return Array.from(teamMap.values());
}

// FIPAV pool standings sorting with tiebreakers (Page 5)
export function sortGroupStandings(teamsInGroup: Team[], groupMatches: Match[]): Team[] {
  return [...teamsInGroup].sort((a, b) => {
    // 1. Classification points descending
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    // Tie in points! Let's check tied group of teams
    const tiedTeams = teamsInGroup.filter(t => t.points === a.points);

    if (tiedTeams.length === 2) {
      // Tie between exactly 2 teams: Head-to-Head (scontro diretto)
      const h2hMatch = groupMatches.find(m =>
        m.status === 'completed' &&
        ((m.team1?.id === a.id && m.team2?.id === b.id) || (m.team1?.id === b.id && m.team2?.id === a.id))
      );
      if (h2hMatch && h2hMatch.winnerId) {
        return h2hMatch.winnerId === a.id ? -1 : 1;
      }
    } else if (tiedTeams.length > 2) {
      // Tie between 3, 4, or 5 teams: Point Quotient in matches played only among the tied teams
      const tiedIds = new Set(tiedTeams.map(t => t.id));

      const getTiedQuotient = (id: string) => {
        let won = 0;
        let lost = 0;
        groupMatches.forEach(m => {
          if (m.status !== 'completed' || !m.team1 || !m.team2) return;
          if (tiedIds.has(m.team1.id) && tiedIds.has(m.team2.id)) {
            if (m.team1.id === id) {
              m.sets.forEach(s => {
                won += s.team1;
                lost += s.team2;
              });
            } else if (m.team2.id === id) {
              m.sets.forEach(s => {
                won += s.team2;
                lost += s.team1;
              });
            }
          }
        });
        return lost === 0 ? won : won / lost;
      };

      const qA = getTiedQuotient(a.id);
      const qB = getTiedQuotient(b.id);
      if (qB !== qA) {
        return qB - qA; // Higher quotient ranked first
      }
    }

    // 2. Best point quotient of the entire pool (pointsWon / pointsLost)
    const ratioA = a.pointsWon / (a.pointsLost || 1);
    const ratioB = b.pointsWon / (b.pointsLost || 1);
    if (ratioB !== ratioA) {
      return ratioB - ratioA;
    }

    // 3. Fallback: position in the initial entry list (better seed is earlier in the list)
    const sortedOriginal = sortTeamsByEntryList(teamsInGroup);
    const idxA = sortedOriginal.findIndex(t => t.id === a.id);
    const idxB = sortedOriginal.findIndex(t => t.id === b.id);
    return idxA - idxB;
  });
}

// Compute global FIPAV standings (Classifica Avulsa - Page 5)
export function computeFipavStandings(teams: Team[], matches: Match[]): Team[] {
  const computedTeams = computeTeamStats(teams, matches);

  // Check if there are group stage matches
  const groupMatches = matches.filter(m => m.phase === 'gironi' || m.groupName);
  const hasGroups = groupMatches.length > 0;

  if (!hasGroups) {
    // If no groups, standard overall sorting
    return [...computedTeams].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;

      const aSetRatio = a.setsWon / (a.setsLost || 1);
      const bSetRatio = b.setsWon / (b.setsLost || 1);
      if (bSetRatio !== aSetRatio) return bSetRatio - aSetRatio;

      const aPointRatio = a.pointsWon / (a.pointsLost || 1);
      const bPointRatio = b.pointsWon / (b.pointsLost || 1);
      return bPointRatio - aPointRatio;
    });
  }

  // Group teams by their designated group property
  const groups: Record<string, Team[]> = {};
  computedTeams.forEach(t => {
    if (t.group) {
      if (!groups[t.group]) groups[t.group] = [];
      groups[t.group].push(t);
    }
  });

  // Sort each group independently using sortGroupStandings
  const sortedGroups: Record<string, Team[]> = {};
  Object.keys(groups).forEach(gName => {
    const groupMatchesFiltered = groupMatches.filter(m => m.groupName === gName);
    sortedGroups[gName] = sortGroupStandings(groups[gName], groupMatchesFiltered);
  });

  // Map each team ID to its position (0-indexed) in its group standings
  const teamPositions = new Map<string, number>();
  Object.keys(sortedGroups).forEach(gName => {
    sortedGroups[gName].forEach((t, idx) => {
      teamPositions.set(t.id, idx);
    });
  });

  // Sort using Classifica Avulsa priorities
  return [...computedTeams].sort((a, b) => {
    const aPos = teamPositions.has(a.id) ? teamPositions.get(a.id)! : 999;
    const bPos = teamPositions.has(b.id) ? teamPositions.get(b.id)! : 999;

    // a) miglior posizione nella classifica del girone
    if (aPos !== bPos) {
      return aPos - bPos;
    }

    // b) miglior quoziente ottenuto dividendo i punti conquistati in classifica per il numero delle gare disputate
    const aGares = a.wins + a.losses;
    const bGares = b.wins + b.losses;
    const qPtsA = aGares === 0 ? 0 : a.points / aGares;
    const qPtsB = bGares === 0 ? 0 : b.points / bGares;
    if (qPtsB !== qPtsA) {
      return qPtsB - qPtsA;
    }

    // c) miglior quoziente set tra i sets vinti e quelli perduti
    const qSetsA = a.setsLost === 0 ? a.setsWon : a.setsWon / a.setsLost;
    const qSetsB = b.setsLost === 0 ? b.setsWon : b.setsWon / b.setsLost;
    if (qSetsB !== qSetsA) {
      return qSetsB - qSetsA;
    }

    // d) miglior quoziente punti tra i punti realizzati e quelli subiti
    const qGPointsA = a.pointsLost === 0 ? a.pointsWon : a.pointsWon / a.pointsLost;
    const qGPointsB = b.pointsLost === 0 ? b.pointsWon : b.pointsWon / b.pointsLost;
    if (qGPointsB !== qGPointsA) {
      return qGPointsB - qGPointsA;
    }

    // e) miglior posizione nella lista d'ingresso confermata all'inizio del torneo
    const sortedOriginal = sortTeamsByEntryList(computedTeams);
    const idxA = sortedOriginal.findIndex(t => t.id === a.id);
    const idxB = sortedOriginal.findIndex(t => t.id === b.id);
    return idxA - idxB;
  });
}


// Helper to shuffle array for FIPAV randomized fasce
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[arr[j] ? j : i]] = [arr[arr[j] ? j : i], arr[i]];
  }
  return arr;
}

// Split teams into FIPAV-compliant balanced pools (Pages 1, 2, 3)
export function splitTeamsIntoGroups(teams: Team[], groupCount: number): Record<string, Team[]> {
  const sorted = sortTeamsByEntryList(teams);
  const G = groupCount;
  const K = Math.ceil(sorted.length / G);

  const groups: Record<string, Team[]> = {};
  const groupNames: string[] = [];
  for (let i = 0; i < G; i++) {
    const char = String.fromCharCode(65 + i); // 'A', 'B', 'C', etc.
    const name = `Girone ${char}`;
    groups[name] = [];
    groupNames.push(name);
  }

  // Divide sorted teams into K fasce (merit tiers), each of size G
  for (let fIdx = 0; fIdx < K; fIdx++) {
    let tierTeams = sorted.slice(fIdx * G, (fIdx + 1) * G);

    // FIPAV random draw: for odd K (like 3 or 5), the last fascia is automatically drawn randomly
    const isRandomDraw = (K % 2 !== 0) && (fIdx === K - 1);
    if (isRandomDraw) {
      tierTeams = shuffleArray(tierTeams);
    }

    // Direction placement:
    // Odd 1-based fasce -> POOL A to last Pool (forward)
    // Even 1-based fasce -> last Pool to POOL A (backward)
    const fasciaNum = fIdx + 1;
    const isForward = (fasciaNum % 2 !== 0);

    if (isForward) {
      for (let j = 0; j < tierTeams.length; j++) {
        const groupName = groupNames[j];
        if (groupName) {
          groups[groupName].push({ ...tierTeams[j], group: groupName });
        }
      }
    } else {
      for (let j = 0; j < tierTeams.length; j++) {
        const groupName = groupNames[G - 1 - j];
        if (groupName) {
          groups[groupName].push({ ...tierTeams[j], group: groupName });
        }
      }
    }
  }

  return groups;
}

// Generate FIPAV-compliant round-robin scheduled matches for pools (Pages 1, 2, 3)
export function generateRoundRobinMatches(
  groups: Record<string, Team[]>,
  startHour: string = '09:00',
  durationMinutes: number = 40,
  courtCount: number = 2,
  pointsPerSet?: 15 | 21,
  maxSets?: 1 | 3
): Match[] {
  const groupNames = Object.keys(groups);
  let matchIdCounter = 1001; // Easy ID prefix block for pool matches

  // Parse start hour
  const [startHr, startMin] = startHour.split(':').map(Number);
  
  // 1. Pre-generate matches list ordered within each pool to follow official schedules
  const allGroupMatches: Record<string, Match[]> = {};

  groupNames.forEach((groupName) => {
    const groupTeams = sortTeamsByEntryList(groups[groupName]); // sorted pool teams represent fasce order
    const n = groupTeams.length;
    const groupMatchesList: Match[] = [];

    if (n === 3) {
      // Pool Round Robin SI - 3 teams per group (Page 1)
      const T = groupTeams;
      const mIds = [
        `m-g-${matchIdCounter++}`,
        `m-g-${matchIdCounter++}`,
        `m-g-${matchIdCounter++}`,
      ];

      // Gara 1: Fascia 1 vs Fascia 3 (T[0] vs T[2])
      groupMatchesList.push({
        id: mIds[0],
        round: 1,
        roundLabel: `${groupName}`,
        position: 1,
        team1: T[0],
        team2: T[2],
        team1Score: 0,
        team2Score: 0,
        sets: [],
        status: 'scheduled',
        court: '',
        time: '',
        phase: 'gironi',
        groupName,
        pointsPerSet,
        maxSets,
        nextMatchId: mIds[2], // Winner plays in Gara 3
        nextMatchSlot: 'team1',
        loserMatchId: mIds[1], // Loser plays in Gara 2
        loserMatchSlot: 'team1',
      });

      // Gara 2: Loser Gara 1 vs Fascia 2 (TBD vs T[1])
      groupMatchesList.push({
        id: mIds[1],
        round: 1,
        roundLabel: `${groupName}`,
        position: 2,
        team1: null, // Populated via Gara 1 loser
        team2: T[1],
        team1Score: 0,
        team2Score: 0,
        sets: [],
        status: 'scheduled',
        court: '',
        time: '',
        phase: 'gironi',
        groupName,
        pointsPerSet,
        maxSets,
      });

      // Gara 3: Winner Gara 1 vs Fascia 2 (TBD vs T[1])
      groupMatchesList.push({
        id: mIds[2],
        round: 1,
        roundLabel: `${groupName}`,
        position: 3,
        team1: null, // Populated via Gara 1 winner
        team2: T[1],
        team1Score: 0,
        team2Score: 0,
        sets: [],
        status: 'scheduled',
        court: '',
        time: '',
        phase: 'gironi',
        groupName,
        pointsPerSet,
        maxSets,
      });

    } else if (n === 4) {
      // Pool Round Robin 4 - 4 teams per group (Page 2)
      const T = groupTeams;
      const order = [
        [0, 3], // 1° gara: Fascia 1 vs 4
        [1, 2], // 2° gara: Fascia 2 vs 3
        [0, 2], // 3° gara: Fascia 1 vs 3
        [1, 3], // 4° gara: Fascia 2 vs 4
        [2, 3], // 5° gara: Fascia 3 vs 4
        [0, 1], // 6° gara: Fascia 1 vs 2
      ];

      order.forEach(([i1, i2], idx) => {
        groupMatchesList.push({
          id: `m-g-${matchIdCounter++}`,
          round: 1,
          roundLabel: `${groupName}`,
          position: idx + 1,
          team1: T[i1],
          team2: T[i2],
          team1Score: 0,
          team2Score: 0,
          sets: [],
          status: 'scheduled',
          court: '',
          time: '',
          phase: 'gironi',
          groupName,
          pointsPerSet,
          maxSets,
         });
      });

    } else if (n === 5) {
      // Pool Round Robin 5 - 5 teams per group (Page 3)
      const T = groupTeams;
      const order = [
        [0, 4], // 1° gara: Fascia 1 vs 5
        [1, 3], // 2° gara: Fascia 2 vs 4
        [0, 2], // 3° gara: Fascia 1 vs 3
        [3, 4], // 4° gara: Fascia 4 vs 5
        [1, 4], // 5° gara: Fascia 2 vs 5
        [2, 3], // 6° gara: Fascia 3 vs 4
        [0, 3], // 7° gara: Fascia 1 vs 4
        [1, 2], // 8° gara: Fascia 2 vs 3
        [2, 4], // 9° gara: Fascia 3 vs 5
        [0, 1], // 10° gara: Fascia 1 vs 2
      ];

      order.forEach(([i1, i2], idx) => {
        groupMatchesList.push({
          id: `m-g-${matchIdCounter++}`,
          round: 1,
          roundLabel: `${groupName}`,
          position: idx + 1,
          team1: T[i1],
          team2: T[i2],
          team1Score: 0,
          team2Score: 0,
          sets: [],
          status: 'scheduled',
          court: '',
          time: '',
          phase: 'gironi',
          groupName,
          pointsPerSet,
          maxSets,
        });
      });

    } else {
      // Fallback to traditional Round Robin
      const grTeams = [...groupTeams];
      if (grTeams.length % 2 !== 0) {
        grTeams.push({
          ...BYE_TEAM,
          id: `bye_group_${groupName}_${grTeams.length}`,
          name: `BYE_riposo`,
          group: groupName,
        });
      }
      const len = grTeams.length;
      for (let i = 0; i < len; i++) {
        for (let j = i + 1; j < len; j++) {
          groupMatchesList.push({
            id: `m-g-${matchIdCounter++}`,
            round: 1,
            roundLabel: `${groupName}`,
            position: groupMatchesList.length + 1,
            team1: grTeams[i],
            team2: grTeams[j],
            team1Score: 0,
            team2Score: 0,
            sets: [],
            status: 'scheduled',
            court: '',
            time: '',
            phase: 'gironi',
            groupName,
            pointsPerSet,
            maxSets,
          });
        }
      }
    }

    allGroupMatches[groupName] = groupMatchesList;
  });

  // 2. Interleave match numbers across all pools to alternate play cleanly
  const interleavedMatches: Match[] = [];
  const maxMatchesCount = Math.max(...groupNames.map(gn => allGroupMatches[gn]?.length || 0), 0);

  for (let j = 0; j < maxMatchesCount; j++) {
    groupNames.forEach((groupName) => {
      const list = allGroupMatches[groupName];
      if (list && j < list.length) {
        interleavedMatches.push(list[j]);
      }
    });
  }

  // 3. Coordinate assigned courts and match starting times
  let globalMatchIndex = 0;
  interleavedMatches.forEach((match) => {
    const courtIndex = (globalMatchIndex % courtCount) + 1;
    match.court = `Campo ${courtIndex}`;

    const timeSlotIndex = Math.floor(globalMatchIndex / courtCount);
    const totalOffsetMinutes = timeSlotIndex * durationMinutes;

    const matchDate = new Date();
    matchDate.setHours(startHr, startMin + totalOffsetMinutes, 0);

    const hh = String(matchDate.getHours()).padStart(2, '0');
    const mm = String(matchDate.getMinutes()).padStart(2, '0');
    match.time = `${hh}:${mm}`;

    match.position = globalMatchIndex + 1;
    globalMatchIndex++;
  });

  // Run initial auto resolve to automatically schedule/pass resting BYE matches if present
  return autoResolveAndPropagate(interleavedMatches);
}

// Compute group standings independently under FIPAV pool guidelines
export function computeGroupStandings(teams: Team[], groupMatches: Match[]): Record<string, Team[]> {
  const computedTeams = computeTeamStats(teams, groupMatches);
  const groups: Record<string, Team[]> = {};

  computedTeams.forEach(t => {
    if (t.group) {
      if (!groups[t.group]) groups[t.group] = [];
      groups[t.group].push(t);
    }
  });

  // Sort each group's teams using our FIPAV compliant sortGroupStandings
  Object.keys(groups).forEach(gName => {
    const groupMatchesFiltered = groupMatches.filter(m => m.groupName === gName);
    groups[gName] = sortGroupStandings(groups[gName], groupMatchesFiltered);
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

export function recalculateTournamentStages(allMatches: Match[], teamsList: Team[]): Match[] {
  let updated = allMatches.map(m => ({ ...m }));
  let changed = true;
  let iterations = 0;

  // 1. Handle group standings to playoff seeding propagation
  const hasGironi = updated.some(m => m.phase === 'gironi');
  // Check if playoff matches are present
  const hasPlayoffs = updated.some(m => m.phase === 'eliminazione' || m.id.startsWith('m-p-'));

  if (hasGironi && hasPlayoffs) {
    const groupMatches = updated.filter(m => m.phase === 'gironi');
    const standings = computeGroupStandings(teamsList, groupMatches);
    const groupNames = Object.keys(standings).sort();

    const qualifiers: Team[] = [];
    if (groupNames.length === 2) {
      const gA = standings[groupNames[0]] || [];
      const gB = standings[groupNames[1]] || [];
      const firstA = gA[0] || null;
      const secondB = gB[1] || gB[0] || null;
      const firstB = gB[0] || null;
      const secondA = gA[1] || gA[0] || null;
      qualifiers.push(firstA, secondB, firstB, secondA);
    } else if (groupNames.length >= 4) {
      const gA = standings[groupNames[0]] || [];
      const gB = standings[groupNames[1]] || [];
      const gC = standings[groupNames[2]] || [];
      const gD = standings[groupNames[3]] || [];
      qualifiers.push(
        gA[0] || null, gB[1] || null,
        gC[0] || null, gD[1] || null,
        gB[0] || null, gA[1] || null,
        gD[0] || null, gC[1] || null
      );
    } else if (groupNames.length === 1) {
      const gA = standings[groupNames[0]] || [];
      qualifiers.push(gA[0] || null, gA[1] || null);
    }

    // Update Round 1 playoff matches
    const round1Playoffs = updated
      .filter(m => (m.phase === 'eliminazione' || m.id.startsWith('m-p-')) && m.round === 1)
      .sort((a, b) => a.position - b.position);

    for (let i = 0; i < round1Playoffs.length; i++) {
      const matchInUpdatedIdx = updated.findIndex(m => m.id === round1Playoffs[i].id);
      if (matchInUpdatedIdx !== -1) {
        const team1Val = qualifiers[i * 2] || BYE_TEAM;
        const team2Val = qualifiers[i * 2 + 1] || BYE_TEAM;

        // If team1 or team2 has changed in our computed schedule, reset the match!
        if (updated[matchInUpdatedIdx].team1?.id !== team1Val.id) {
          updated[matchInUpdatedIdx].team1 = team1Val;
          updated[matchInUpdatedIdx].sets = [];
          updated[matchInUpdatedIdx].team1Score = 0;
          updated[matchInUpdatedIdx].team2Score = 0;
          updated[matchInUpdatedIdx].status = 'scheduled';
          updated[matchInUpdatedIdx].winnerId = undefined;
        }
        if (updated[matchInUpdatedIdx].team2?.id !== team2Val.id) {
          updated[matchInUpdatedIdx].team2 = team2Val;
          updated[matchInUpdatedIdx].sets = [];
          updated[matchInUpdatedIdx].team1Score = 0;
          updated[matchInUpdatedIdx].team2Score = 0;
          updated[matchInUpdatedIdx].status = 'scheduled';
          updated[matchInUpdatedIdx].winnerId = undefined;
        }
      }
    }
  }

  // 2. Propagate and reset downstream matches if necessary
  while (changed && iterations < 100) {
    changed = false;
    iterations++;

    for (let i = 0; i < updated.length; i++) {
      const m = updated[i];

      // Auto resolve if scheduled and team with bypass BYE
      if (m.status !== 'completed' && m.team1 && m.team2) {
        const resolved = autoResolveMatchWithByes(m);
        if (resolved) {
          updated[i] = resolved;
          changed = true;
          continue;
        }
      }

      // Propagate Winner if completed
      if (m.status === 'completed' && m.winnerId) {
        const winnerTeam = m.winnerId === m.team1?.id ? m.team1 : (m.winnerId === m.team2?.id ? m.team2 : null);
        if (!winnerTeam) {
          // Reset match because winner ID is invalid or team was removed/changed
          m.status = 'scheduled';
          m.sets = [];
          m.team1Score = 0;
          m.team2Score = 0;
          m.winnerId = undefined;
          changed = true;
          continue;
        }

        if (m.nextMatchId) {
          const nextMatchIndex = updated.findIndex(nm => nm.id === m.nextMatchId);
          if (nextMatchIndex !== -1) {
            const nextMatch = updated[nextMatchIndex];
            if (m.nextMatchSlot === 'team1') {
              if (nextMatch.team1?.id !== winnerTeam.id) {
                nextMatch.team1 = winnerTeam;
                nextMatch.sets = [];
                nextMatch.team1Score = 0;
                nextMatch.team2Score = 0;
                nextMatch.status = 'scheduled';
                nextMatch.winnerId = undefined;
                changed = true;
              }
            } else if (m.nextMatchSlot === 'team2') {
              if (nextMatch.team2?.id !== winnerTeam.id) {
                nextMatch.team2 = winnerTeam;
                nextMatch.sets = [];
                nextMatch.team1Score = 0;
                nextMatch.team2Score = 0;
                nextMatch.status = 'scheduled';
                nextMatch.winnerId = undefined;
                changed = true;
              }
            }
          }
        }

        // Propagate Loser
        if (m.loserMatchId) {
          const loserTeam = m.winnerId === m.team1?.id ? m.team2 : m.team1;
          const loserMatchIndex = updated.findIndex(nm => nm.id === m.loserMatchId);
          if (loserMatchIndex !== -1 && loserTeam) {
            const loserMatch = updated[loserMatchIndex];
            if (m.loserMatchSlot === 'team1') {
              if (loserMatch.team1?.id !== loserTeam.id) {
                loserMatch.team1 = loserTeam;
                loserMatch.sets = [];
                loserMatch.team1Score = 0;
                loserMatch.team2Score = 0;
                loserMatch.status = 'scheduled';
                loserMatch.winnerId = undefined;
                changed = true;
              }
            } else if (m.loserMatchSlot === 'team2') {
              if (loserMatch.team2?.id !== loserTeam.id) {
                loserMatch.team2 = loserTeam;
                loserMatch.sets = [];
                loserMatch.team1Score = 0;
                loserMatch.team2Score = 0;
                loserMatch.status = 'scheduled';
                loserMatch.winnerId = undefined;
                changed = true;
              }
            }
          }
        }
      }
    }
  }

  return updated;
}
