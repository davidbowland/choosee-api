import { getChoiceById, getDecisionById, queryUserIdsBySessionId } from '../services/dynamodb'
import { DecisionObject, Session } from '../types'

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

  const sessionChoices = await getChoiceById(session.choiceId)
  const choiceNames = sessionChoices.choices.reduce(
    (acc, value) => (value.name ? [...acc, value.name] : acc),
    [] as string[],
  )
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
    const winnerPlace = sessionChoices.choices.filter((place) => place.name === randomWinner)[0]
    return {
      ...session,
      status: {
        current: 'winner',
        winner: winnerPlace,
      },
    }
  }

  return {
    ...session,
    status: {
      current: 'finished',
    },
  }
}
