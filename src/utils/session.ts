import { advanceRounds, fetchChoices } from '../services/maps'
import { DecisionObject, Session } from '../types'
import { getDecisionById, queryUserIdsBySessionId } from '../services/dynamodb'

const areDecisionsComplete = (choiceNames: string[], decisions: DecisionObject): boolean =>
  choiceNames.every((name) => name in decisions)

const intersection = (set1: string[], set2: string[]): string[] => set1.filter((value) => set2.indexOf(value) >= 0)

const extractPositiveDecisions = (decisions: DecisionObject): string[] =>
  Object.keys(decisions).filter((name) => decisions[name])

export const updateSessionStatus = async (sessionId: string, session: Session): Promise<Session> => {
  const decisionIds = await queryUserIdsBySessionId(sessionId)
  if (
    decisionIds.length < session.voterCount ||
    session.status.current === 'winner' ||
    session.status.current === 'finished'
  ) {
    return session
  }

  const sessionChoices = await fetchChoices(session.choiceId)
  const choiceNames = sessionChoices.map((value) => value.name)
  const allDecisions = await Promise.all(
    decisionIds.map((userId) => getDecisionById(sessionId, userId).then((decision) => decision.decisions)),
  )
  const allDecisionsComplete = allDecisions.every((decisions) => areDecisionsComplete(choiceNames, decisions))
  if (!allDecisionsComplete) {
    return session
  }

  const winners = allDecisions.map(extractPositiveDecisions).reduce(intersection)
  if (winners.length > 0) {
    const randomWinner = winners[Math.floor(Math.random() * winners.length)]
    const winnerPlace = sessionChoices.filter((place) => place.name === randomWinner)[0]
    return {
      ...session,
      status: {
        current: 'winner',
        pageId: session.status.pageId,
        winner: winnerPlace,
      },
    }
  }

  try {
    const newChoices = await advanceRounds(session.choiceId)
    return {
      ...session,
      status: {
        current: newChoices.choices.length > 0 ? 'deciding' : 'finished',
        pageId: session.status.pageId + 1,
      },
    }
  } catch (error) {
    return {
      ...session,
      status: {
        current: 'finished',
        pageId: session.status.pageId + 1,
      },
    }
  }
}
