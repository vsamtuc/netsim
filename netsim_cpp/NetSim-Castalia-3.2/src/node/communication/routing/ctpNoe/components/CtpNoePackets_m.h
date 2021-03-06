//
// Generated file, do not edit! Created by opp_msgc 4.4 from src/node/communication/routing/ctpNoe/components/CtpNoePackets.msg.
//

#ifndef _CTPNOEPACKETS_M_H_
#define _CTPNOEPACKETS_M_H_

#include <omnetpp.h>

// opp_msgc version check
#define MSGC_VERSION 0x0404
#if (MSGC_VERSION!=OMNETPP_VERSION)
#    error Version mismatch! Probably this file was generated by an earlier version of opp_msgc: 'make clean' should help.
#endif

// cplusplus {{
#include "RoutingPacket_m.h"
// }}



/**
 * Struct generated from src/node/communication/routing/ctpNoe/components/CtpNoePackets.msg by opp_msgc.
 */
struct neighbor_stat_entry
{
    neighbor_stat_entry();
    uint16_t ll_addr;
    uint8_t inquality;
};

void doPacking(cCommBuffer *b, neighbor_stat_entry& a);
void doUnpacking(cCommBuffer *b, neighbor_stat_entry& a);

/**
 * Class generated from <tt>src/node/communication/routing/ctpNoe/components/CtpNoePackets.msg</tt> by opp_msgc.
 * <pre>
 * packet CtpData extends RoutingPacket{
 * 	uint8_t options ;
 * 	uint8_t thl ;
 * 	uint16_t etx ;
 * 	uint16_t origin ;
 * 	uint8_t originSeqNo ;
 * 	uint8_t type ;
 * }
 * </pre>
 */
class CtpData : public ::RoutingPacket
{
  protected:
    uint8_t options_var;
    uint8_t thl_var;
    uint16_t etx_var;
    uint16_t origin_var;
    uint8_t originSeqNo_var;
    uint8_t type_var;

  private:
    void copy(const CtpData& other);

  protected:
    // protected and unimplemented operator==(), to prevent accidental usage
    bool operator==(const CtpData&);

  public:
    CtpData(const char *name=NULL, int kind=0);
    CtpData(const CtpData& other);
    virtual ~CtpData();
    CtpData& operator=(const CtpData& other);
    virtual CtpData *dup() const {return new CtpData(*this);}
    virtual void parsimPack(cCommBuffer *b);
    virtual void parsimUnpack(cCommBuffer *b);

    // field getter/setter methods
    virtual uint8_t getOptions() const;
    virtual void setOptions(uint8_t options);
    virtual uint8_t getThl() const;
    virtual void setThl(uint8_t thl);
    virtual uint16_t getEtx() const;
    virtual void setEtx(uint16_t etx);
    virtual uint16_t getOrigin() const;
    virtual void setOrigin(uint16_t origin);
    virtual uint8_t getOriginSeqNo() const;
    virtual void setOriginSeqNo(uint8_t originSeqNo);
    virtual uint8_t getType() const;
    virtual void setType(uint8_t type);
};

inline void doPacking(cCommBuffer *b, CtpData& obj) {obj.parsimPack(b);}
inline void doUnpacking(cCommBuffer *b, CtpData& obj) {obj.parsimUnpack(b);}

/**
 * Class generated from <tt>src/node/communication/routing/ctpNoe/components/CtpNoePackets.msg</tt> by opp_msgc.
 * <pre>
 * packet CtpBeacon extends RoutingPacket{
 * 	uint8_t options ;
 * 	uint16_t parent ;
 * 	uint16_t etx ;
 * }
 * </pre>
 */
class CtpBeacon : public ::RoutingPacket
{
  protected:
    uint8_t options_var;
    uint16_t parent_var;
    uint16_t etx_var;

  private:
    void copy(const CtpBeacon& other);

  protected:
    // protected and unimplemented operator==(), to prevent accidental usage
    bool operator==(const CtpBeacon&);

  public:
    CtpBeacon(const char *name=NULL, int kind=0);
    CtpBeacon(const CtpBeacon& other);
    virtual ~CtpBeacon();
    CtpBeacon& operator=(const CtpBeacon& other);
    virtual CtpBeacon *dup() const {return new CtpBeacon(*this);}
    virtual void parsimPack(cCommBuffer *b);
    virtual void parsimUnpack(cCommBuffer *b);

    // field getter/setter methods
    virtual uint8_t getOptions() const;
    virtual void setOptions(uint8_t options);
    virtual uint16_t getParent() const;
    virtual void setParent(uint16_t parent);
    virtual uint16_t getEtx() const;
    virtual void setEtx(uint16_t etx);
};

inline void doPacking(cCommBuffer *b, CtpBeacon& obj) {obj.parsimPack(b);}
inline void doUnpacking(cCommBuffer *b, CtpBeacon& obj) {obj.parsimUnpack(b);}

/**
 * Class generated from <tt>src/node/communication/routing/ctpNoe/components/CtpNoePackets.msg</tt> by opp_msgc.
 * <pre>
 * packet CtpLe extends CtpBeacon{
 * 	uint8_t flags ;
 * 	uint8_t seq ;
 * 	neighbor_stat_entry linkest_footer[] ;
 * }
 * </pre>
 */
class CtpLe : public ::CtpBeacon
{
  protected:
    uint8_t flags_var;
    uint8_t seq_var;
    neighbor_stat_entry *linkest_footer_var; // array ptr
    unsigned int linkest_footer_arraysize;

  private:
    void copy(const CtpLe& other);

  protected:
    // protected and unimplemented operator==(), to prevent accidental usage
    bool operator==(const CtpLe&);

  public:
    CtpLe(const char *name=NULL, int kind=0);
    CtpLe(const CtpLe& other);
    virtual ~CtpLe();
    CtpLe& operator=(const CtpLe& other);
    virtual CtpLe *dup() const {return new CtpLe(*this);}
    virtual void parsimPack(cCommBuffer *b);
    virtual void parsimUnpack(cCommBuffer *b);

    // field getter/setter methods
    virtual uint8_t getFlags() const;
    virtual void setFlags(uint8_t flags);
    virtual uint8_t getSeq() const;
    virtual void setSeq(uint8_t seq);
    virtual void setLinkest_footerArraySize(unsigned int size);
    virtual unsigned int getLinkest_footerArraySize() const;
    virtual neighbor_stat_entry& getLinkest_footer(unsigned int k);
    virtual const neighbor_stat_entry& getLinkest_footer(unsigned int k) const {return const_cast<CtpLe*>(this)->getLinkest_footer(k);}
    virtual void setLinkest_footer(unsigned int k, const neighbor_stat_entry& linkest_footer);
};

inline void doPacking(cCommBuffer *b, CtpLe& obj) {obj.parsimPack(b);}
inline void doUnpacking(cCommBuffer *b, CtpLe& obj) {obj.parsimUnpack(b);}

/**
 * Class generated from <tt>src/node/communication/routing/ctpNoe/components/CtpNoePackets.msg</tt> by opp_msgc.
 * <pre>
 * message CtpNotification{
 * 	int cnType enum (Notification_type) ;
 * 	int cnInterface enum (Notification_interface) ;
 * 	int cnEvent enum (Notification_event) ;
 * 	int cnCommand enum (Notification_command) ;
 * 	uint8_t error enum (tos_err_types) ;
 * }
 * </pre>
 */
class CtpNotification : public ::cMessage
{
  protected:
    int cnType_var;
    int cnInterface_var;
    int cnEvent_var;
    int cnCommand_var;
    uint8_t error_var;

  private:
    void copy(const CtpNotification& other);

  protected:
    // protected and unimplemented operator==(), to prevent accidental usage
    bool operator==(const CtpNotification&);

  public:
    CtpNotification(const char *name=NULL, int kind=0);
    CtpNotification(const CtpNotification& other);
    virtual ~CtpNotification();
    CtpNotification& operator=(const CtpNotification& other);
    virtual CtpNotification *dup() const {return new CtpNotification(*this);}
    virtual void parsimPack(cCommBuffer *b);
    virtual void parsimUnpack(cCommBuffer *b);

    // field getter/setter methods
    virtual int getCnType() const;
    virtual void setCnType(int cnType);
    virtual int getCnInterface() const;
    virtual void setCnInterface(int cnInterface);
    virtual int getCnEvent() const;
    virtual void setCnEvent(int cnEvent);
    virtual int getCnCommand() const;
    virtual void setCnCommand(int cnCommand);
    virtual uint8_t getError() const;
    virtual void setError(uint8_t error);
};

inline void doPacking(cCommBuffer *b, CtpNotification& obj) {obj.parsimPack(b);}
inline void doUnpacking(cCommBuffer *b, CtpNotification& obj) {obj.parsimUnpack(b);}


#endif // _CTPNOEPACKETS_M_H_
